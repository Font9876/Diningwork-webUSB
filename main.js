document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connect-btn');
    const saveBtn = document.getElementById('save-btn');
    const settingsForm = document.getElementById('settings-form');
    const statusDiv = document.getElementById('status');
    const midiChannelSelect = document.getElementById('midi-channel');

    let device = null;

    // --- Command Protocol Definition (must match Arduino code) ---
    const CMD_SET_ESB_CHANNEL = 0x01;
    const CMD_SET_CC_LAYER = 0x02;
    const CMD_SET_MIDI_CHANNEL = 0x03;
    const CMD_SET_BUTTON_MODE = 0x04;
    const CMD_SAVE_TO_FLASH = 0xAA;

    // --- USB Device Filters (using the IDs you provided) ---
    const deviceFilters = [
        { vendorId: 0x000A, productId: 0x000A },
        { vendorId: 0x001A, productId: 0x000A },
        { vendorId: 0x002A, productId: 0x000A },
        { vendorId: 0x003A, productId: 0x000A },
    ];

    // Populate MIDI Channel dropdown
    for (let i = 1; i <= 16; i++) {
        const option = document.createElement('option');
        option.value = i - 1; // Send value 0-15
        option.textContent = `Channel ${i}`;
        midiChannelSelect.appendChild(option);
    }
    
    // Check for WebUSB support
    if (!('usb' in navigator)) {
        updateStatus('WebUSB is not supported by this browser.', true);
        connectBtn.disabled = true;
        return;
    }

    const connect = async () => {
        try {
            device = await navigator.usb.requestDevice({ filters: deviceFilters });
            await device.open();
            if (device.configuration === null) {
                await device.selectConfiguration(1);
            }
            // The interface number must match the firmware.
            // TinyUSB WebUSB defaults to the first available interface.
            await device.claimInterface(0); 
            
            updateStatus(`Connected to ${device.productName}`, false);
            connectBtn.style.display = 'none';
            settingsForm.style.display = 'block';

        } catch (err) {
            updateStatus(`Error: ${err.message}`, true);
        }
    };

    const saveSettings = async () => {
        if (!device || !device.opened) {
            updateStatus('Device is not connected.', true);
            return;
        }

        try {
            updateStatus('Sending settings...', false, 'status-info');

            const esbChannel = parseInt(document.getElementById('esb-channel').value);
            const ccLayer = parseInt(document.getElementById('cc-layer').value);
            const midiChannel = parseInt(document.getElementById('midi-channel').value);
            const buttonMode = parseInt(document.getElementById('button-mode').value);

            // Send each setting as a 2-byte command packet
            await device.transferOut(1, new Uint8Array([CMD_SET_ESB_CHANNEL, esbChannel]));
            await device.transferOut(1, new Uint8Array([CMD_SET_CC_LAYER, ccLayer]));
            await device.transferOut(1, new Uint8Array([CMD_SET_MIDI_CHANNEL, midiChannel]));
            await device.transferOut(1, new Uint8Array([CMD_SET_BUTTON_MODE, buttonMode]));
            
            // Send the final command to save everything to flash
            await device.transferOut(1, new Uint8Array([CMD_SAVE_TO_FLASH, 0x00])); // Value is ignored

            updateStatus('Settings saved successfully!', false, 'status-connected');

        } catch (err) {
            updateStatus(`Error saving settings: ${err.message}`, true);
        }
    };

    const disconnect = () => {
        device = null;
        updateStatus('Device disconnected.', true);
        connectBtn.style.display = 'block';
        settingsForm.style.display = 'none';
    };
    
    function updateStatus(message, isError, a_class) {
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'status-disconnected' : (a_class ? a_class : 'status-connected');
    }

    connectBtn.addEventListener('click', connect);
    saveBtn.addEventListener('click', saveSettings);
    
    // Listen for the device being unplugged
    navigator.usb.addEventListener('disconnect', (event) => {
        if (device && event.device.serialNumber === device.serialNumber) {
            disconnect();
        }
    });
});
