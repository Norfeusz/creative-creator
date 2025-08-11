// Uruchomienie skryptu po całkowitym załadowaniu struktury DOM strony
document.addEventListener('DOMContentLoaded', () => {
    // Pobranie referencji do wszystkich potrzebnych elementów DOM
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

    // Definicja list reklamodawców używanych do dynamicznego wypełniania pola <select>
    const initialAdvertisers = [
        { value: '', text: 'Wybierz reklamodawcę...', disabled: true },
        { value: '93931', text: 'Triverna' },
        { value: '76829', text: 'TaniaKsiazka.pl' },
        { value: 'other', text: 'Inny reklamodawca' }
    ];
    const fullAdvertiserList = [
        { value: '77742', text: 'AliExpress' }, { value: '87762', text: 'Allegro_A' }, { value: '8076990', text: 'AZ' }, { value: '94637', text: 'Biedronka_veovee' },
        { value: '78547', text: 'Cersanit S.A.' }, { value: '83580', text: 'Decathlon_A' }, { value: '94642', text: 'DI VOLIO' }, { value: '87516', text: 'EDAXO' },
        { value: '94847', text: 'eksprespozyczka.pl Argentum Capital Sp. z o.o.' }, { value: '77769', text: 'eSky.pl S.A.' }, { value: '77641', text: 'Ezebra.pl' },
        { value: '92969', text: 'eFortuna' }, { value: '93753', text: 'GEMINI APPS sp. z o. o.' }, { value: '94130', text: 'Hemanpower' }, { value: '76989', text: 'home.pl' },
        { value: '76776', text: 'Hop-Sport.pl' }, { value: '94269', text: 'Ikano Bank' }, { value: '87403', text: 'Internetowy Kantor' }, { value: '94523', text: 'LUXMED' },
        { value: '94419', text: 'Mediaszop' }, { value: '93914', text: 'Miska Karmy' }, { value: '83256', text: 'mBank ekonto_promocja-03-2019' }, { value: '83003', text: 'mBank Konto-intensive' },
        { value: '85479', text: 'mBank Konto-mLeasing' }, { value: '94297', text: 'mBank - Uniqa' }, { value: '88705', text: 'mLeasing mAuto.pl' }, { value: '94696', text: 'nazwa.pl_A_28' },
        { value: '77313', text: 'Oleole.pl' }, { value: '77774', text: 'Orange Polska' }, { value: '93963', text: 'PLUSH' }, { value: '95776', text: 'PZU' },
        { value: '77016', text: 'Rankomat' }, { value: '77318', text: 'RTV Euro AGD' }, { value: '96025', text: 'Rynek Pierwotny' }, { value: '77532', text: 'Smyk' },
        { value: '93926', text: 'Tan Expert' }, { value: '88651', text: 'Tauron_A27' }, { value: '87679', text: 'Walutomat' }, { value: '93886', text: 'WWF' }
    ];

    /**
     * Wypełnia element <select> opcjami z podanej listy.
     * @param {Array<object>} optionsArray - Tablica obiektów do stworzenia opcji.
     */
    function populateAdvertiserSelect(optionsArray) {
        advertiserSelect.innerHTML = ''; // Czyszczenie istniejących opcji
        optionsArray.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            if (opt.disabled) {
                option.disabled = true;
            }
            advertiserSelect.appendChild(option);
        });
        advertiserSelect.selectedIndex = 0;
    }

    /**
     * Wyświetla komunikaty dla użytkownika (o sukcesie lub błędzie).
     * @param {string} message - Tekst komunikatu do wyświetlenia.
     * @param {boolean} isSuccess - Czy komunikat jest pozytywny?
     * @param {HTMLElement} container - Element DOM, w którym ma się pojawić komunikat.
     */
    function showMessage(message, isSuccess, container) {
        container.textContent = message;
        container.className = 'message';
        container.classList.add(isSuccess ? 'success' : 'error');
        container.style.display = 'block';
    }

    // Dodanie nasłuchiwania na zdarzenie 'submit' dla formularza weryfikacji klucza API
    apiKeyForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Zapobiegamy domyślnemu przeładowaniu strony
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showMessage('Proszę wprowadzić klucz API.', false, apiKeyMessageContainer);
            return;
        }

        showMessage('Weryfikacja klucza...', true, apiKeyMessageContainer);

        try {
            // Wysłanie zapytania POST do serwera w celu weryfikacji klucza
            const response = await fetch('/verify-api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey })
            });

            const result = await response.json();
            
            if (response.ok) {
                // Zapisanie klucza w sessionStorage, aby był dostępny na czas trwania sesji
                sessionStorage.setItem('apiKey', apiKey);
                
                // Ukrycie formularza weryfikacji i pokazanie głównej aplikacji
                apiKeyVerificationDiv.style.display = 'none';
                mainAppDiv.style.display = 'block';
                populateAdvertiserSelect(initialAdvertisers);
            } else {
                showMessage(result.message, false, apiKeyMessageContainer);
            }
        } catch (error) {
            showMessage('Wystąpił nieoczekiwany błąd serwera podczas weryfikacji.', false, apiKeyMessageContainer);
        }
    });

    // Dodanie nasłuchiwania na zmianę wyboru na liście reklamodawców
    advertiserSelect.addEventListener('change', (e) => {
        const selection = e.target.value;
        
        advertiserIdField.style.display = 'none'; // Domyślnie ukryj pole do wpisywania ID

        if (selection === 'other') {
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
            advertiserIdField.style.display = 'block'; // Pokaż pole tylko dla opcji manualnej
        }
    });

    // Dodanie nasłuchiwania na zdarzenie 'click' dla przycisku tworzenia kreacji
    submitBtn.addEventListener('click', async () => {
        messageContainer.style.display = 'none';
        
        const apiKey = sessionStorage.getItem('apiKey'); // Pobranie klucza API z pamięci sesji
        if (!apiKey) {
            showMessage('Błąd: Sesja wygasła lub klucz API nie został zapisany.', false, messageContainer);
            return;
        }
        
        const formData = new FormData(creativeForm);
        const data = Object.fromEntries(formData.entries());
        data.apiKey = apiKey; // Dołączenie klucza do wysyłanych danych

        if (!data.advertiserSelect || (data.advertiserSelect === 'manual' && !data.advertiserId)) {
            showMessage('Proszę wybrać reklamodawcę lub wpisać jego ID.', false, messageContainer);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Przetwarzanie...';
        
        try {
            // Wysłanie zapytania POST z danymi formularza do serwera
            const response = await fetch('/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            showMessage(result.message, response.ok, messageContainer);
            
            if (response.ok) {
                creativeForm.reset();
                populateAdvertiserSelect(initialAdvertisers);
                advertiserIdField.style.display = 'none';
            }
        } catch (error) {
            showMessage('Wystąpił krytyczny błąd serwera podczas tworzenia kreacji.', false, messageContainer);
        } finally {
            // Niezależnie od wyniku, odblokowujemy przycisk
            submitBtn.disabled = false;
            submitBtn.textContent = 'Utwórz kreację';
        }
    });
});