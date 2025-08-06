document.addEventListener('DOMContentLoaded', (event) => {
    const apiKeyContainer = document.getElementById('apiKeyContainer');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const startBtn = document.getElementById('startBtn');
    const mainApp = document.getElementById('mainApp');

    const advertiserSelect = document.getElementById('advertiserSelect');
    const otherAdvertiserSelectField = document.getElementById('otherAdvertiserSelectField');
    const otherAdvertiserSelect = document.getElementById('otherAdvertiserSelect');
    const advertiserIdField = document.getElementById('advertiserIdField');
    const form = document.getElementById('creativeForm');
    const submitBtn = document.getElementById('submitBtn');
    const messageContainer = document.getElementById('messageContainer');

    // Statyczna lista reklamodawców
    const OTHER_ADVERTISERS = [
        { id: '77742', name: 'AliExpress' },
        // ... (wszyscy pozostali reklamodawcy, którzy byli wcześniej)
        { id: '88278', name: 'Test' }
    ];

    let globalApiKey = '';

    // Obsługa strony powitalnej
    startBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            globalApiKey = apiKey;
            apiKeyContainer.style.display = 'none';
            mainApp.style.display = 'block';
            populateOtherAdvertisersList();
        } else {
            alert('Proszę wprowadzić klucz API.');
        }
    });

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

    advertiserSelect.addEventListener('change', toggleAdvertiserFields);
    otherAdvertiserSelect.addEventListener('change', toggleManualIdField);

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
        
        data.advertiserId = finalAdvertiserId;
        data.apiKey = globalApiKey; // Klucz API dołączamy tutaj

        try {
            const response = await fetch('/create', {
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