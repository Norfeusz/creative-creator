// public/script.js - Kod frontendowy z nową logiką
document.addEventListener('DOMContentLoaded', () => {

    // --- Zmienne i odwołania do elementów DOM ---
    let verifiedApiKey = null;
    const apiKeyVerificationDiv = document.getElementById('apiKeyVerification');
    const mainAppDiv = document.getElementById('mainApp');
    const apiKeyForm = document.getElementById('apiKeyForm');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKeyMessageContainer = document.getElementById('apiKeyMessageContainer');
    const creativeForm = document.getElementById('creativeForm');
    const advertiserSelect = document.getElementById('advertiserSelect');
    const advertiserIdField = document.getElementById('advertiserIdField');
    const submitBtn = document.getElementById('submitBtn');
    const messageContainer = document.getElementById('messageContainer');

    // --- Listy Reklamodawców ---
    // Lista początkowa, wyświetlana domyślnie
    const initialAdvertisers = [
        { value: '', text: 'Wybierz reklamodawcę...', disabled: true },
        { value: '93931', text: 'Triverna' },
        { value: '76829', text: 'TaniaKsiazka.pl' },
        { value: 'other', text: 'Inny reklamodawca' }
    ];

    // Pełna lista reklamodawców
    const fullAdvertiserList = [
        { value: '77742', text: 'AliExpress' },
        { value: '87762', text: 'Allegro_A' },
        { value: '8076990', text: 'AZ' },
        { value: '94637', text: 'Biedronka_veovee' },
        { value: '78547', text: 'Cersanit S.A.' },
        { value: '83580', text: 'Decathlon_A' },
        { value: '94642', text: 'DI VOLIO' },
        { value: '87516', text: 'EDAXO' },
        { value: '94847', text: 'eksprespozyczka.pl Argentum Capital Sp. z o.o.' },
        { value: '77769', text: 'eSky.pl S.A.' },
        { value: '77641', text: 'Ezebra.pl' },
        { value: '92969', text: 'eFortuna' },
        { value: '93753', text: 'GEMINI APPS sp. z o. o.' },
        { value: '94130', text: 'Hemanpower' },
        { value: '76989', text: 'home.pl' },
        { value: '76776', text: 'Hop-Sport.pl' },
        { value: '94269', text: 'Ikano Bank' },
        { value: '87403', text: 'Internetowy Kantor' },
        { value: '94523', text: 'LUXMED' },
        { value: '94419', text: 'Mediaszop' },
        { value: '93914', text: 'Miska Karmy' },
        { value: '83256', text: 'mBank ekonto_promocja-03-2019' },
        { value: '83003', text: 'mBank Konto-intensive' },
        { value: '85479', text: 'mBank Konto-mLeasing' },
        { value: '94297', text: 'mBank - Uniqa' },
        { value: '88705', text: 'mLeasing mAuto.pl' },
        { value: '94696', text: 'nazwa.pl_A_28' },
        { value: '77313', text: 'Oleole.pl' },
        { value: '77774', text: 'Orange Polska' },
        { value: '93963', text: 'PLUSH' },
        { value: '95776', text: 'PZU' },
        { value: '77016', text: 'Rankomat' },
        { value: '77318', text: 'RTV Euro AGD' },
        { value: '96025', text: 'Rynek Pierwotny' },
        { value: '77532', text: 'Smyk' },
        { value: '93926', text: 'Tan Expert' },
        { value: '88651', text: 'Tauron_A27' },
        { value: '87679', text: 'Walutomat' },
        { value: '93886', text: 'WWF' }
    ];

    // --- Funkcje Pomocnicze ---
    
    /**
     * Wypełnia element <select> opcjami z podanej listy
     * @param {Array} optionsArray - Tablica obiektów {value, text, disabled?}
     */
    function populateAdvertiserSelect(optionsArray) {
        advertiserSelect.innerHTML = ''; // Czyści istniejące opcje
        optionsArray.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if (opt.disabled) {
                option.disabled = true;
            }
            advertiserSelect.appendChild(option);
        });
        advertiserSelect.selectedIndex = 0; // Ustawia wybraną opcję na pierwszą z listy
    }

    function showMessage(message, isSuccess, container) {
        container.textContent = message;
        container.className = 'message';
        container.classList.add(isSuccess ? 'success' : 'error');
        container.style.display = 'block';
    }

    // --- Logika Obsługi Zdarzeń ---

    apiKeyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showMessage('Proszę podać klucz API.', false, apiKeyMessageContainer);
            return;
        }
        try {
            const response = await fetch('/verify-api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: apiKey })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                verifiedApiKey = apiKey;
                apiKeyVerificationDiv.style.display = 'none';
                mainAppDiv.style.display = 'block';
                populateAdvertiserSelect(initialAdvertisers); // Wypełnij listę po zalogowaniu
            } else {
                showMessage(result.message || 'Wystąpił błąd weryfikacji.', false, apiKeyMessageContainer);
            }
        } catch (error) {
            console.error('Błąd fetch:', error);
            showMessage('Błąd połączenia z serwerem. Sprawdź konsolę.', false, apiKeyMessageContainer);
        }
    });

    // NOWA LOGIKA OBSŁUGI ZMIAN W POLU WYBORU
    advertiserSelect.addEventListener('change', (e) => {
        const selection = e.target.value;
        
        // Zawsze ukrywaj pole do wpisania ID, chyba że wybrano 'manual'
        advertiserIdField.style.display = 'none';

        if (selection === 'other') {
            // Generuj pełną listę opcji
            const fullOptions = [
                { value: '', text: 'Wybierz z pełnej listy...', disabled: true },
                ...fullAdvertiserList,
                { value: 'manual', text: 'Inny reklamodawca (wpisz ID)' },
                { value: 'back', text: '« Wróć do podstawowej listy' }
            ];
            populateAdvertiserSelect(fullOptions);
        } else if (selection === 'back') {
            populateAdvertiserSelect(initialAdvertisers);
        } else if (selection === 'manual') {
            advertiserIdField.style.display = 'block';
        }
    });

    submitBtn.addEventListener('click', async () => {
        messageContainer.style.display = 'none';
        if (!verifiedApiKey) {
            showMessage('Błąd: Klucz API nie został zweryfikowany.', false, messageContainer);
            return;
        }
        
        const formData = new FormData(creativeForm);
        const data = Object.fromEntries(formData.entries());
        data.apiKey = verifiedApiKey;

        // Walidacja - sprawdź czy wybrano jakąś wartość lub czy wpisano ręcznie ID
        if (!data.advertiserSelect || (data.advertiserSelect === 'manual' && !data.advertiserId)) {
            showMessage('Proszę wybrać reklamodawcę lub wpisać jego ID.', false, messageContainer);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Przetwarzanie...';
        
        try {
            const response = await fetch('/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            showMessage(result.message, response.ok, messageContainer);
            if (response.ok) {
                creativeForm.reset();
                populateAdvertiserSelect(initialAdvertisers); // Reset do listy początkowej
                advertiserIdField.style.display = 'none';
            }
        } catch (error) {
            console.error('Błąd fetch /create:', error);
            showMessage('Błąd połączenia z serwerem podczas tworzenia kreacji.', false, messageContainer);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Utwórz kreację';
        }
    });
});