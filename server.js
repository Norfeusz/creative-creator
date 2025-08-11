// server.js - Uporządkowany kod
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'public')));

// --- Konfiguracja i stałe API ---
const API_BASE_URL = 'https://api.system.netsalesmedia.pl';
const LINK_TXT_FOLDER_NAME = 'Link TXT';

const API_URL_GET_USER_INFO = `${API_BASE_URL}/access/user/get`;
const API_URL_LIST_SETS = `${API_BASE_URL}/creatives/creativeset/list`;
const API_URL_GET_SINGLE_SET = `${API_BASE_URL}/creatives/creativeset/single`;
const API_URL_CREATE_SET = `${API_BASE_URL}/creatives/creativeset/create`;
const API_URL_CREATE_CREATIVE = `${API_BASE_URL}/creatives/creative/link/create`;
const API_URL_GET_TRACKING_CATEGORIES = `${API_BASE_URL}/partnerships/advertiser/findTrackingCategories`;

// --- Funkcje pomocnicze komunikujące się z API Ingenious ---

// --- Szukanie folderu, który w nazwie zawiera "link" ---
async function findLinkTxtFolderId(advertiserId, apiKey) {
    try {
        const searchPattern = /link/i;
        const config = { headers: { 'x-api-key': apiKey }, params: { advertiserId: advertiserId } };
        const response = await axios.get(API_URL_LIST_SETS, config);
        if (response.data && Array.isArray(response.data)) {
            const linkTxtFolder = response.data.find(set => searchPattern.test(set.name));
            return linkTxtFolder ? linkTxtFolder.creativeSetId : null;
        }
        return null;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized");
        }
        console.error('Błąd w findLinkTxtFolderId:', error.response ? error.response.data : error.message);
        return null;
    }
}

// --- Pobieranie ID kategorii z tego folderu ---
async function getProductCategoryIdFromSet(creativeSetId, apiKey) {
    try {
        const config = { headers: { 'x-api-key': apiKey }, params: { creativeSetId: creativeSetId } };
        const response = await axios.get(API_URL_GET_SINGLE_SET, config);
        return response.data?.productCategoryId || null;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized");
        }
        console.error('Błąd w getProductCategoryIdFromSet:', error.response ? error.response.data : error.message);
        return null;
    }
}

// ---  Pobieranie domyślnej kategoriii dla reklamodawcy, jeśli trzeba stworzyć folder "Link TXT" od zera. ---
async function getAdvertiserDefaultCategory(advertiserId, apiKey) {
    try {
        const iqlQuery = `advertiser.id = '${advertiserId}'`;
        const config = { headers: { 'x-api-key': apiKey, 'Content-Type': 'text/plain' } };
        const response = await axios.post(API_URL_GET_TRACKING_CATEGORIES, iqlQuery, config);
        if (response.data?.entries?.length > 0) {
            return response.data.entries[0].trackingCategoryId;
        }
        return null;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized");
        }
        console.error('Błąd w getAdvertiserDefaultCategory:', error.response ? error.response.data : error.message);
        return null;
    }
}

// --- Tworzenie nowego folderu lub podfolderu. ---
async function createNewCreativeSet(setData, apiKey) {
    try {
        const requestBody = {
            commandId: uuidv4(),
            creativeSetId: uuidv4(),
            advertiserId: setData.advertiserId,
            name: setData.name,
            defaultTargetURL: setData.defaultTargetUrl,
            productCategoryId: setData.productCategoryId,
            ...(setData.parentCreativeSetId && { parentCreativeSetId: setData.parentCreativeSetId })
        };
        const config = { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } };
        const response = await axios.post(API_URL_CREATE_SET, requestBody, config);
        if (response.data?.errors) {
            console.error('Błąd API podczas tworzenia folderu:', response.data.errors);
            return null;
        }
        return requestBody.creativeSetId;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized");
        }
        console.error('Błąd w createNewCreativeSet:', error.response ? error.response.data : error.message);
        return null;
    }
}

// ---  Tworzenie finalnej kreacji linkowej. ---
async function createLinkCreative(creativeData, apiKey) {
    try {
        const requestBody = {
            commandId: uuidv4(),
            creativeId: uuidv4(),
            creativeSetId: creativeData.creativeSetId,
            name: creativeData.creativeName,
            content: '.',
            description: 'Automatycznie stworzona kreacja przez skrypt',
            targetUrl: creativeData.targetUrl,
            status: 'ACTIVE'
        };
        const config = { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } };
        const response = await axios.post(API_URL_CREATE_CREATIVE, requestBody, config);
        if (response.data?.errors) {
            console.error('Błąd API podczas tworzenia kreacji:', response.data.errors);
            return null;
        }
        return response.data;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized");
        }
        console.error('Błąd w createLinkCreative:', error.response ? error.response.data : error.message);
        return null;
    }
}

// --- Sprawdzanie, jaki jest ostatni numer podfolderu, aby stworzyć kolejny ---
async function findHighestCreativeNumber(parentCreativeSetId, advertiserId, apiKey) {
    try {
        const config = { headers: { 'x-api-key': apiKey }, params: { creativeSetId: parentCreativeSetId, advertiserId: advertiserId } };
        const response = await axios.get(API_URL_LIST_SETS, config);
        let highestNumber = 0;
        if (response.data && Array.isArray(response.data)) {
            response.data.forEach(set => {
                const match = set.name.match(/^(\d+)/);
                if (match) {
                    const number = parseInt(match[1], 10);
                    if (number > highestNumber) {
                        highestNumber = number;
                    }
                }
            });
        }
        return highestNumber;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized");
        }
        console.error('Błąd w findHighestCreativeNumber:', error.response ? error.response.data : error.message);
        return 0;
    }
}

// --- Funkcja główna ---

async function runAutomation(advertiserId, creativeName, campaignPeriod, targetUrl, apiKey) {
    try {
        // --- Dodanie parametrów do linków Taniej książki ---
        let finalTargetUrl = targetUrl;
        if (advertiserId === '76829') {
            const urlSeparator = targetUrl.includes('?') ? '&' : '?';
            const urlParams = `${urlSeparator}utm_source=pp&utm_medium=cps&utm_campaign=SalesMedia&utm_content=#{PARTNER_ID}`;
            finalTargetUrl = `${targetUrl}${urlParams}`;
        }
        // --- Sprawdzanie czy istnieje folder link. Jeśli nie tworzenie takiego. ---
        let parentFolderId = await findLinkTxtFolderId(advertiserId, apiKey);
        let productCategoryId;
        if (!parentFolderId) {
            productCategoryId = await getAdvertiserDefaultCategory(advertiserId, apiKey);
            if (!productCategoryId) {
                return { success: false, message: 'Nie udało się pobrać domyślnej kategorii produktu. Nie można utworzyć folderu głównego.' };
            }
            parentFolderId = await createNewCreativeSet({
                advertiserId,
                name: LINK_TXT_FOLDER_NAME,
                defaultTargetUrl: finalTargetUrl,
                productCategoryId
            }, apiKey);
            if (!parentFolderId) {
                return { success: false, message: 'Nie udało się utworzyć głównego folderu "Link TXT".' };
            }
        } else {
            productCategoryId = await getProductCategoryIdFromSet(parentFolderId, apiKey);
            if (!productCategoryId) {
                return { success: false, message: 'Nie udało się pobrać ID kategorii produktu z istniejącego folderu "Link TXT".' };
            }
        }

        //--- Projektowanie nowego podfolderu ---
        const highestNumber = await findHighestCreativeNumber(parentFolderId, advertiserId, apiKey);
        const newCreativeNumber = highestNumber + 1;
        const newCreativeFolderName = campaignPeriod
            ? `${newCreativeNumber} - ${creativeName} - ${campaignPeriod}`
            : `${newCreativeNumber} - ${creativeName}`;

         //--- Budowa nowego podfolderu ---   
        const newFolderId = await createNewCreativeSet({
            advertiserId,
            parentCreativeSetId: parentFolderId,
            name: newCreativeFolderName,
            defaultTargetUrl: finalTargetUrl,
            productCategoryId
        }, apiKey);
        if (!newFolderId) {
            return { success: false, message: 'Nie udało się utworzyć nowego podfolderu dla kreacji. Sprawdź, czy URL jest poprawny.' };
        }

        // --- Tworzenie kreacji wewnątrz podfolderu ---
        const creativeNameWithPrefix = `LinkTXT - ${newCreativeFolderName}`;
        const creationResult = await createLinkCreative({
            creativeName: creativeNameWithPrefix,
            creativeSetId: newFolderId,
            targetUrl: finalTargetUrl,
        }, apiKey);
        if (creationResult) {
            return { success: true, message: `Kreacja "${creativeNameWithPrefix}" została pomyślnie utworzona!` };
        } else {
            return { success: false, message: 'Nie udało się utworzyć finalnej kreacji. Sprawdź poprawność linku docelowego.' };
        }
    } catch (error) {
        if (error.message === "unauthorized") {
            return { success: false, message: "Błąd autoryzacji. Podałeś nieprawidłowy klucz API lub nie masz uprawnień." };
        }
        console.error('Wystąpił nieoczekiwany błąd w runAutomation:', error);
        return { success: false, message: 'Wystąpił krytyczny błąd serwera podczas automatyzacji.' };
    }
}

// --- Endpointy serwera Express ---

// --- Weryfikacja API-Key ---
app.post('/verify-api-key', async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        return res.status(400).json({ success: false, message: 'Błąd: Klucz API jest wymagany.' });
    }
    try {
        const config = { headers: { 'x-api-key': apiKey } };
        await axios.get(API_URL_GET_USER_INFO, config);
        res.status(200).json({ success: true, message: 'Klucz API zweryfikowany pomyślnie!' });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Nieprawidłowy klucz API lub brak uprawnień.' });
    }
});

// --- Proces tworzenia kreacji ---
app.post('/create', async (req, res) => {
    // Odczytujemy dane z body żądania
    const { advertiserSelect, advertiserId, creativeName, campaignPeriod, targetUrl, apiKey } = req.body;
    
    //  LOGIKA USTALANIA ID REKLAMODAWCY
    let finalAdvertiserId;
    if (advertiserSelect === 'manual') {
        // Jeśli w dropdownie wybrano opcję ręcznego wpisania, bierzemy ID z pola tekstowego
        finalAdvertiserId = advertiserId;
    } else {
        // W każdym innym przypadku, bierzemy ID bezpośrednio z wartości wybranej w dropdownie
        finalAdvertiserId = advertiserSelect;
    }

    // Walidacja
    if (!finalAdvertiserId || !creativeName || !targetUrl || !apiKey) {
        return res.status(400).json({ success: false, message: 'Błąd: Brakuje wymaganych danych (ID reklamodawcy, nazwa, URL, klucz API).' });
    }

    const result = await runAutomation(finalAdvertiserId, creativeName, campaignPeriod, targetUrl, apiKey);

    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(400).json(result);
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Serwer nasłuchuje na porcie ${port}`);
    console.log(`Otwórz http://localhost:${port} w swojej przeglądarce.`);
});