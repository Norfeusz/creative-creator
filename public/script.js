document.addEventListener('DOMContentLoaded', (event) => {
    // Statyczna lista reklamodawców
    const OTHER_ADVERTISERS = [
        { id: '77742', name: 'AliExpress' },
        { id: '87762', name: 'Allegro_A80' },
        { id: '76990', name: 'AZ' },
        { id: '94637', name: 'Biedronka_veovee' },
        { id: '78547', name: 'Cersanit S.A.' },
        { id: '83580', name: 'Decathlon_A60' },
        { id: '94642', name: 'DI VOLIO' },
        { id: '87516', name: 'EDAXO' },
        { id: '92969', name: 'eFortuna' },
        { id: '94847', name: 'eksprespozyczka.pl Argentum Capital Sp. z o.o.' },
        { id: '77769', name: 'eSky.pl S.A.' },
        { id: '77641', name: 'Ezebra.pl' },
        { id: '93753', name: 'GEMINI APPS sp. z o. o.' },
        { id: '94130', name: 'Hemanpower' },
        { id: '76989', name: 'home.pl' },
        { id: '76776', name: 'Hop-Sport.pl' },
        { id: '94269', name: 'Ikano Bank' },
        { id: '87403', name: 'Internetowy Kantor' },
        { id: '94523', name: 'LUXMED' },
        { id: '94297', name: 'mBank - Uniqa' },
        { id: '83256', name: 'mBank ekonto_promocja-03-2019' },
        { id: '83003', name: 'mBank Konto-intensive' },
        { id: '85479', name: 'mBank Konto-mLeasing' },
        { id: '94419', name: 'Mediaszop' },
        { id: '93914', name: 'Miska Karmy' },
        { id: '88705', name: 'mLeasing mAuto.pl' },
        { id: '94696', name: 'nazwa.pl_A_28' },
        { id: '77313', name: 'Oleole.pl' },
        { id: '77774', name: 'Orange Polska' },
        { id: '93963', name: 'PLUSH' },
        { id: '95776', name: 'PZU' },
        { id: '77016', name: 'Rankomat' },
        { id: '77318', name: 'RTV Euro AGD' },
        { id: '96025', name: 'Rynek Pierwotny' },
        { id: '77532', name: 'Smyk' },
        { id: '93926', name: 'Tan Expert' },
        { id: '88651', name: 'Tauron_A27' },
        { id: '87679', name: 'Walutomat' },
        { id: '93886', name: 'WWF' },
        { id: '88278', name: 'Test' }
    ];

    const advertiserSelect = document.getElementById('advertiserSelect');
    const otherAdvertiserSelectField = document.getElementById('otherAdvertiserSelectField');
    const otherAdvertiserSelect = document.getElementById('otherAdvertiserSelect');
    const advertiserIdField = document.getElementById('advertiserIdField');
    const form = document.getElementById('creativeForm');
    const submitBtn = document.getElementById('submitBtn');
    const messageContainer = document.getElementById('messageContainer');

    function populateOtherAdvertisersList() {
        OTHER_ADVERTISERS.forEach(adv => {
            const option = document.createElement('option');
            option.value = adv.id;
            option.textContent = adv.name;
            otherAdvertiserSelect.appendChild(option);
        });
    }

    function toggleAdvertiserFields() {
        const value = advertiserSelect.value;
        otherAdvertiserSelectField.style.display = 'none';
        advertiserIdField.style.display = 'none';

        if (value === 'other') {
            otherAdvertiserSelectField.style.display = 'block';
        }
    }
    
    function toggleManualIdField() {
        const value = otherAdvertiserSelect.value;
        if (value === 'manual') {
            advertiserIdField.style.display = 'block';
        } else {
            advertiserIdField.style.display = 'none';
        }
    }

    // Wypełniamy listę innych reklamodawców na starcie
    populateOtherAdvertisersList();

    // Dodajemy słuchacze zdarzeń
    advertiserSelect.addEventListener('change', toggleAdvertiserFields);
    otherAdvertiserSelect.addEventListener('change', toggleManualIdField);

    // Uruchamiamy funkcję na starcie, aby upewnić się, że stan jest poprawny
    toggleAdvertiserFields();
    toggleManualIdField();

    submitBtn.addEventListener('click', async () => {
        messageContainer.textContent = '';
        messageContainer.className = '';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        let finalAdvertiserId;

        if (data.advertiserSelect === 'other') {
            if (data.otherAdvertiserSelect === 'manual') {
                finalAdvertiserId = data.advertiserId;
            } else {
                finalAdvertiserId = data.otherAdvertiserSelect;
            }
        } else {
            finalAdvertiserId = data.advertiserSelect;
        }
        
        // Zaktualizuj dane w formularzu, aby serwer otrzymał poprawne ID
        data.advertiserId = finalAdvertiserId;

        try {
            const response = await fetch('/api/index.js', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                messageContainer.textContent = result.message;
                messageContainer.classList.add('message', 'success');
                document.getElementById('creativeName').value = '';
                document.getElementById('campaignPeriod').value = '';
                document.getElementById('targetUrl').value = '';
            } else {
                messageContainer.textContent = result.message;
                messageContainer.classList.add('message', 'error');
            }
        } catch (error) {
            console.error('Błąd: ', error);
            messageContainer.textContent = 'Wystąpił błąd podczas wysyłania danych.';
            messageContainer.classList.add('message', 'error');
        }
    });
});