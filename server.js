// server.js - Zaktualizowany kod

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// --- Konfiguracja i stałe ---
const API_KEY = process.env.API_KEY;
const API_BASE_URL = 'https://api.system.netsalesmedia.pl';

const LINK_TXT_FOLDER_NAME = 'Link TXT';

// --- Adresy URL endpointów API ---
const API_URL_LIST_SETS = `${API_BASE_URL}/creatives/creativeset/list`;
const API_URL_GET_SINGLE_SET = `${API_BASE_URL}/creatives/creativeset/single`;
const API_URL_CREATE_SET = `${API_BASE_URL}/creatives/creativeset/create`;
const API_URL_CREATE_CREATIVE = `${API_BASE_URL}/creatives/creative/link/create`;
const API_URL_GET_TRACKING_CATEGORIES = `${API_BASE_URL}/partnerships/advertiser/findTrackingCategories`;

// --- Funkcje pomocnicze ---

// Funkcja do szukania folderu 'Link TXT'
async function findLinkTxtFolderId(advertiserId) {
  try {
    const searchPattern = /link/i;
    const config = {
      headers: { 'x-api-key': API_KEY },
      params: { advertiserId: advertiserId }
    };
    const response = await axios.get(API_URL_LIST_SETS, config);
    if (response.status !== 200) {
      return null;
    }
    if (response.data && Array.isArray(response.data)) {
        const linkTxtFolder = response.data.find(set => searchPattern.test(set.name));
        return linkTxtFolder ? linkTxtFolder.creativeSetId : null;
    }
    return null;
  } catch (error) {
    if (error.response) console.error('Szczegóły błędu:', error.response.data);
    return null;
  }
}

// Funkcja do pobierania ID kategorii produktu z folderu
async function getProductCategoryIdFromSet(creativeSetId) {
  try {
    const config = {
      headers: { 'x-api-key': API_KEY },
      params: { creativeSetId: creativeSetId }
    };
    const response = await axios.get(API_URL_GET_SINGLE_SET, config);
    if (response.status !== 200) {
      return null;
    }
    if (response.data && response.data.productCategoryId) {
      return response.data.productCategoryId;
    }
    return null;
  } catch (error) {
    if (error.response) console.error('Szczegóły błędu:', error.response.data);
    return null;
  }
}

// Funkcja do pobierania domyślnej kategorii z endpointu reklamodawcy
async function getAdvertiserDefaultCategory(advertiserId) {
    try {
        const iqlQuery = `advertiser.id = '${advertiserId}'`;
        const config = {
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'text/plain' },
        };
        // Wysyłamy zapytanie POST z parametrem IQL w ciele zapytania
        const response = await axios.post(API_URL_GET_TRACKING_CATEGORIES, iqlQuery, config);
        
        if (response.data && Array.isArray(response.data.entries) && response.data.entries.length > 0) {
            // Zwracamy ID pierwszej kategorii, zakładając, że jest domyślna
            return response.data.entries[0].trackingCategoryId;
        }
        return null;
    } catch (error) {
        if (error.response) console.error('Szczegóły błędu:', error.response.data);
        return null;
    }
}

// Funkcja do tworzenia nowego podfolderu
async function createNewSubfolder(advertiserId, parentCreativeSetId, folderName, defaultTargetUrl, productCategoryId) {
  try {
    const requestBody = {
      commandId: uuidv4(),
      creativeSetId: uuidv4(),
      advertiserId: advertiserId,
      parentCreativeSetId: parentCreativeSetId,
      name: folderName,
      defaultTargetURL: defaultTargetUrl,
      productCategoryId: productCategoryId,
    };
    const config = {
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
    };
    const response = await axios.post(API_URL_CREATE_SET, requestBody, config);
    if (response.status !== 200) {
      return null;
    }
    if (response.data && response.data.errors) {
        return null;
    }
    return requestBody.creativeSetId;
  } catch (error) {
    if (error.response) console.error('Szczegóły błędu:', error.response.data);
    return null;
  }
}

// Funkcja do tworzenia folderu głównego (bez parentCreativeSetId)
async function createNewCreativeSet(advertiserId, folderName, defaultTargetUrl, productCategoryId) {
    try {
        const requestBody = {
            commandId: uuidv4(),
            creativeSetId: uuidv4(),
            advertiserId: advertiserId,
            name: folderName,
            defaultTargetURL: defaultTargetUrl,
            productCategoryId: productCategoryId,
        };
        const config = {
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
        };
        const response = await axios.post(API_URL_CREATE_SET, requestBody, config);
        if (response.status !== 200) {
            return null;
        }
        if (response.data && response.data.errors) {
            return null;
        }
        return requestBody.creativeSetId;
    } catch (error) {
        if (error.response) console.error('Szczegóły błędu:', error.response.data);
        return null;
    }
}

// Funkcja do tworzenia kreacji
async function createLinkCreative(creativeData) {
  try {
    const requestBody = {
      commandId: uuidv4(),
      creativeId: uuidv4(),
      creativeSetId: creativeData.creativeSetId,
      name: creativeData.creativeName,
      content: '.',
      description: 'Automatycznie stworzona kreacja przez skrypt',
      targetUrl: creativeData.targetUrl,
      status: 'ACTIVE',
    };
    const config = {
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
    };
    const response = await axios.post(API_URL_CREATE_CREATIVE, requestBody, config);
    if (response.status !== 200) {
      return null;
    }
    if (response.data && response.data.errors) {
        return null;
    }
    return response.data;
  } catch (error) {
    if (error.response) console.error('Szczegóły błędu:', error.response.data);
    return null;
  }
}

// Funkcja do znajdowania najwyższej liczby w nazwach folderów
async function findHighestCreativeNumber(parentCreativeSetId, advertiserId) {
    try {
        const config = {
            headers: { 'x-api-key': API_KEY },
            params: {
                creativeSetId: parentCreativeSetId,
                advertiserId: advertiserId
            }
        };
        const response = await axios.get(API_URL_LIST_SETS, config);
        if (response.data && Array.isArray(response.data)) {
            let highestNumber = 0;
            response.data.forEach(set => {
                const match = set.name.match(/^(\d+)/);
                if (match) {
                    const number = parseInt(match[1], 10);
                    if (number > highestNumber) {
                        highestNumber = number;
                    }
                }
            });
            return highestNumber;
        }
        return 0;
    } catch (error) {
        if (error.response) console.error('Szczegóły błędu:', error.response.data);
        return 0;
    }
}

// --- Główna funkcja zarządzająca całym procesem ---
async function runAutomation(advertiserId, creativeName, campaignPeriod, targetUrl) {
    let urlSeparator = '?';
    if (targetUrl.includes('?')) {
        urlSeparator = '&';
    }

    let finalTargetUrl = targetUrl;
    if (advertiserId === '76829') {
        const urlParams = `${urlSeparator}utm_source=pp&utm_medium=cps&utm_campaign=SalesMedia&utm_content=#{PARTNER_ID}`;
        finalTargetUrl = `${targetUrl}${urlParams}`;
    }

    let parentFolderId = await findLinkTxtFolderId(advertiserId);
    let productCategoryId;

    if (!parentFolderId) {
        // Jeśli nie znaleziono folderu, tworzymy go w katalogu głównym
        productCategoryId = await getAdvertiserDefaultCategory(advertiserId);
        if (!productCategoryId) {
            return { success: false, message: 'Nie udało się pobrać ID domyślnej kategorii produktu dla tego reklamodawcy.' };
        }
        parentFolderId = await createNewCreativeSet(advertiserId, LINK_TXT_FOLDER_NAME, finalTargetUrl, productCategoryId);
        if (!parentFolderId) {
            return { success: false, message: 'Nie udało się utworzyć głównego folderu Link TXT.' };
        }
    } else {
        // Jeśli folder już istnieje, pobieramy z niego productCategoryId
        productCategoryId = await getProductCategoryIdFromSet(parentFolderId);
        if (!productCategoryId) {
            return { success: false, message: 'Nie udało się pobrać ID kategorii produktu z folderu Link TXT.' };
        }
    }

    const highestNumber = await findHighestCreativeNumber(parentFolderId, advertiserId);
    const newCreativeNumber = highestNumber + 1;

    let newCreativeFolderName;
    if (campaignPeriod) {
        newCreativeFolderName = `${newCreativeNumber} - ${creativeName} - ${campaignPeriod}`;
    } else {
        newCreativeFolderName = `${newCreativeNumber} - ${creativeName}`;
    }

    const newFolderId = await createNewSubfolder(advertiserId, parentFolderId, newCreativeFolderName, finalTargetUrl, productCategoryId);
    if (!newFolderId) {
        return { success: false, message: 'Nie udało się utworzyć nowego folderu. Sprawdź, czy URL jest poprawny.' };
    }

    const creativeNameWithPrefix = `LinkTXT - ${newCreativeFolderName}`;
    const myCreative = {
        creativeName: creativeNameWithPrefix,
        creativeContent: '.',
        creativeSetId: newFolderId,
        targetUrl: finalTargetUrl,
    };
    const creationResult = await createLinkCreative(myCreative);

    if (creationResult) {
        return { success: true, message: `Kreacja "${creativeNameWithPrefix}" została pomyślnie utworzona!` };
    } else {
        return { success: false, message: 'Nie udało się utworzyć kreacji. Upewnij się, że link docelowy jest poprawny.' };
    }
}

app.post('/create', async (req, res) => {
    const { advertiserSelect, otherAdvertiserSelect, advertiserId, creativeName, campaignPeriod, targetUrl } = req.body;
    let finalAdvertiserId;

    if (advertiserSelect === 'other') {
        if (otherAdvertiserSelect === 'manual') {
            finalAdvertiserId = advertiserId;
        } else {
            finalAdvertiserId = otherAdvertiserSelect;
        }
    } else {
        finalAdvertiserId = advertiserSelect;
    }

    if (!finalAdvertiserId || !creativeName || !targetUrl) {
        return res.status(400).json({ success: false, message: 'Błąd: Brakuje wymaganych danych.' });
    }

    try {
        const result = await runAutomation(finalAdvertiserId, creativeName, campaignPeriod, targetUrl);
        if (result && result.success) {
            res.status(200).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Błąd podczas przetwarzania żądania:', error);
        res.status(500).json({ success: false, message: 'Wystąpił nieoczekiwany błąd serwera.' });
    }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Serwer nasłuchuje na porcie ${port}`);
    console.log(`Otwórz http://localhost:${port}/ w swojej przeglądarce.`);
});