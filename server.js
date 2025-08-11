// Importowanie wymaganych modułów
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware do parsowania JSON, danych z formularzy i serwowania plików statycznych
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'public')));

// Stałe konfiguracyjne aplikacji
const API_BASE_URL = 'https://api.system.netsalesmedia.pl';
const LINK_TXT_FOLDER_NAME = 'Link TXT';

// Stałe przechowujące pełne adresy URL do poszczególnych endpointów API
const API_URL_GET_USER_INFO = `${API_BASE_URL}/access/user/get`;
const API_URL_LIST_SETS = `${API_BASE_URL}/creatives/creativeset/list`;
const API_URL_GET_SINGLE_SET = `${API_BASE_URL}/creatives/creativeset/single`;
const API_URL_CREATE_SET = `${API_BASE_URL}/creatives/creativeset/create`;
const API_URL_CREATE_CREATIVE = `${API_BASE_URL}/creatives/creative/link/create`;
const API_URL_GET_TRACKING_CATEGORIES = `${API_BASE_URL}/partnerships/advertiser/findTrackingCategories`;

/**
 * Wyszukuje ID folderu zawierającego w nazwie "link" dla danego reklamodawcy.
 * @param {string} advertiserId - ID reklamodawcy.
 * @param {string} apiKey - Klucz API użytkownika.
 * @returns {Promise<string|null>} ID folderu lub null, jeśli nie znaleziono lub w razie błędu.
 */
async function findLinkTxtFolderId(advertiserId, apiKey) {
    try {
        const searchPattern = /link/i; // Wzorzec do wyszukiwania "link" bez względu na wielkość liter
        const config = { headers: { 'x-api-key': apiKey }, params: { advertiserId } };
        const response = await axios.get(API_URL_LIST_SETS, config);

        if (response.data && Array.isArray(response.data)) {
            const linkTxtFolder = response.data.find(set => searchPattern.test(set.name));
            return linkTxtFolder ? linkTxtFolder.creativeSetId : null;
        }
        return null;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized"); // Rzucenie specyficznego błędu w celu dalszej obsługi
        }
        console.error('Błąd w findLinkTxtFolderId:', error.response?.data);
        return null;
    }
}

/**
 * Pobiera ID kategorii produktu z istniejącego folderu (Creative Set).
 * @param {string} creativeSetId - ID folderu, z którego pobierane jest ID kategorii.
 * @param {string} apiKey - Klucz API użytkownika.
 * @returns {Promise<string|null>} ID kategorii produktu lub null.
 */
async function getProductCategoryIdFromSet(creativeSetId, apiKey) {
    try {
        const config = { headers: { 'x-api-key': apiKey }, params: { creativeSetId } };
        const response = await axios.get(API_URL_GET_SINGLE_SET, config);
        return response.data?.productCategoryId || null;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized");
        }
        console.error('Błąd w getProductCategoryIdFromSet:', error.response?.data);
        return null;
    }
}

/**
 * Pobiera domyślną kategorię śledzenia dla reklamodawcy.
 * @param {string} advertiserId - ID reklamodawcy.
 * @param {string} apiKey - Klucz API użytkownika.
 * @returns {Promise<string|null>} ID domyślnej kategorii śledzenia lub null.
 */
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
        console.error('Błąd w getAdvertiserDefaultCategory:', error.response?.data);
        return null;
    }
}

/**
 * Tworzy nowy zestaw kreacji (folder lub podfolder).
 * @param {object} setData - Obiekt z danymi folderu.
 * @param {string} apiKey - Klucz API użytkownika.
 * @returns {Promise<string|null>} ID nowo utworzonego folderu lub null.
 */
async function createNewCreativeSet(setData, apiKey) {
    try {
        // Generowanie unikalnych ID dla polecenia i nowego folderu
        const requestBody = {
            commandId: uuidv4(),
            creativeSetId: uuidv4(),
            advertiserId: setData.advertiserId,
            name: setData.name,
            defaultTargetURL: setData.defaultTargetUrl,
            productCategoryId: setData.productCategoryId,
        };

        // Jeśli podano ID rodzica, tworzymy podfolder
        if (setData.parentCreativeSetId) {
            requestBody.parentCreativeSetId = setData.parentCreativeSetId;
        }
        
        const config = { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } };
        await axios.post(API_URL_CREATE_SET, requestBody, config);

        return requestBody.creativeSetId; // Zwracamy ID, które sami wygenerowaliśmy
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized");
        }
        console.error('Błąd w createNewCreativeSet:', error.response?.data);
        return null;
    }
}


/**
 * Tworzy nową kreację typu link w określonym folderze.
 * @param {object} creativeData - Obiekt z danymi kreacji.
 * @param {string} apiKey - Klucz API użytkownika.
 * @returns {Promise<object|null>} Obiekt z wynikiem operacji lub null.
 */
async function createLinkCreative(creativeData, apiKey) {
    try {
        const requestBody = {
            commandId: uuidv4(),
            creativeId: uuidv4(),
            creativeSetId: creativeData.creativeSetId,
            name: creativeData.creativeName,
            content: '.', // Pole wymagane, treść nieistotna dla linku
            description: 'Automatycznie stworzona kreacja przez skrypt',
            targetUrl: creativeData.targetUrl,
            status: 'ACTIVE'
        };
        const config = { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } };
        const response = await axios.post(API_URL_CREATE_CREATIVE, requestBody, config);
        
        return response.data;
    } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            throw new Error("unauthorized");
        }
        console.error('Błąd w createLinkCreative:', error.response?.data);
        return null;
    }
}

/**
 * Znajduje najwyższy numer na początku nazwy podfolderu w danym folderze.
 * @param {string} parentCreativeSetId - ID folderu nadrzędnego.
 * @param {string} advertiserId - ID reklamodawcy.
 * @param {string} apiKey - Klucz API użytkownika.
 * @returns {Promise<number>} Najwyższy znaleziony numer lub 0.
 */
async function findHighestCreativeNumber(parentCreativeSetId, advertiserId, apiKey) {
    try {
        const config = { headers: { 'x-api-key': apiKey }, params: { creativeSetId: parentCreativeSetId, advertiserId } };
        const response = await axios.get(API_URL_LIST_SETS, config);
        let highestNumber = 0;

        if (response.data && Array.isArray(response.data)) {
            response.data.forEach(set => {
                const match = set.name.match(/^(\d+)/); // Wyciąga cyfry z początku nazwy
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
        console.error('Błąd w findHighestCreativeNumber:', error.response?.data);
        return 0;
    }
}

/**
 * Główna funkcja orkiestrująca cały proces tworzenia kreacji.
 * @param {object} automationData - Dane wejściowe do procesu.
 * @param {string} apiKey - Klucz API użytkownika.
 * @returns {Promise<object>} Obiekt z informacją o sukcesie lub porażce.
 */
async function runAutomation(automationData, apiKey) {
    const { advertiserId, creativeName, campaignPeriod, targetUrl } = automationData;
    
    // Automatyczne dodawanie parametrów UTM dla Taniej książki
    let finalTargetUrl = targetUrl;
    if (advertiserId === '76829') {
        const urlSeparator = targetUrl.includes('?') ? '&' : '?';
        const urlParams = `${urlSeparator}utm_source=pp&utm_medium=cps&utm_campaign=SalesMedia&utm_content=#{PARTNER_ID}`;
        finalTargetUrl = `${targetUrl}${urlParams}`;
    }

    try {
        // Krok 1: Znajdź główny folder lub utwórz go, jeśli nie istnieje.
        let parentFolderId = await findLinkTxtFolderId(advertiserId, apiKey);
        let productCategoryId;

        if (!parentFolderId) {
            productCategoryId = await getAdvertiserDefaultCategory(advertiserId, apiKey);
            if (!productCategoryId) return { success: false, message: 'Nie udało się pobrać domyślnej kategorii produktu.' };
            
            parentFolderId = await createNewCreativeSet({
                advertiserId,
                name: LINK_TXT_FOLDER_NAME,
                defaultTargetUrl: finalTargetUrl,
                productCategoryId
            }, apiKey);
            if (!parentFolderId) return { success: false, message: 'Nie udało się utworzyć głównego folderu Link TXT.' };
        } else {
            productCategoryId = await getProductCategoryIdFromSet(parentFolderId, apiKey);
            if (!productCategoryId) return { success: false, message: 'Nie udało się pobrać ID kategorii z folderu Link TXT.' };
        }

        // Krok 2: Znajdź numer dla nowego podfolderu.
        const highestNumber = await findHighestCreativeNumber(parentFolderId, advertiserId, apiKey);
        const newCreativeNumber = highestNumber + 1;
        const newCreativeFolderName = campaignPeriod
            ? `${newCreativeNumber} - ${creativeName} - ${campaignPeriod}`
            : `${newCreativeNumber} - ${creativeName}`;

        // Krok 3: Utwórz nowy podfolder dla kreacji.
        const newFolderId = await createNewCreativeSet({
            advertiserId,
            parentCreativeSetId: parentFolderId,
            name: newCreativeFolderName,
            defaultTargetUrl: finalTargetUrl,
            productCategoryId
        }, apiKey);
        if (!newFolderId) return { success: false, message: 'Nie udało się utworzyć nowego podfolderu.' };

        // Krok 4: Utwórz finalną kreację linkową.
        const creativeNameWithPrefix = `LinkTXT - ${newCreativeFolderName}`;
        const creationResult = await createLinkCreative({
            creativeName: creativeNameWithPrefix,
            creativeSetId: newFolderId,
            targetUrl: finalTargetUrl,
        }, apiKey);

        if (creationResult) {
            return { success: true, message: `Kreacja "${creativeNameWithPrefix}" została pomyślnie utworzona!` };
        } else {
            return { success: false, message: `Nie udało się utworzyć kreacji "${creativeNameWithPrefix}".` };
        }
    } catch (error) {
        if (error.message === "unauthorized") {
            return { success: false, message: "Błąd autoryzacji: Podałeś nieprawidłowy klucz API lub nie masz uprawnień." };
        }
        return { success: false, message: `Wystąpił nieoczekiwany błąd serwera: ${error.message}` };
    }
}

// Endpoint do weryfikacji klucza API
app.post('/verify-api-key', async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
        return res.status(400).json({ success: false, message: 'Błąd: Brakuje klucza API.' });
    }

    try {
        const config = { headers: { 'x-api-key': apiKey } };
        await axios.get(API_URL_GET_USER_INFO, config);
        res.status(200).json({ success: true, message: 'Klucz API zweryfikowany pomyślnie!' });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Nieprawidłowy klucz API lub brak uprawnień.' });
    }
});

// Endpoint do tworzenia kreacji na podstawie danych z formularza
app.post('/create', async (req, res) => {
    const { advertiserSelect, advertiserId, creativeName, campaignPeriod, targetUrl, apiKey } = req.body;
    
    let finalAdvertiserId;
    if (advertiserSelect === 'manual') {
        finalAdvertiserId = advertiserId;
    } else {
        finalAdvertiserId = advertiserSelect;
    }

    if (!finalAdvertiserId || !creativeName || !targetUrl || !apiKey) {
        return res.status(400).json({ success: false, message: 'Błąd: Brakuje wymaganych danych.' });
    }

    const result = await runAutomation({ advertiserId: finalAdvertiserId, creativeName, campaignPeriod, targetUrl }, apiKey);

    if (result.success) {
        res.status(200).json(result);
    } else {
        res.status(400).json(result);
    }
});

// Endpoint główny, serwujący plik index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Uruchomienie serwera Express
app.listen(port, () => {
    console.log(`Serwer nasłuchuje na porcie ${port}`);
    console.log(`Otwórz http://localhost:${port}/ w swojej przeglądarce.`);
});