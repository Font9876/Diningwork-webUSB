// This script is built from your working "old js" connection logic.

// --- HTML Elements ---
const log = document.getElementById('log');
const connectBtn = document.getElementById('connect');
const saveBtn = document.getElementById('save-btn');
const settingsForm = document.getElementById('settings-form');
const midiChannelSelect = document.getElementById('midi-channel');

// This variable will hold the connected device object
let device = null;

// --- Command Protocol Definition (must match Arduino code) ---
const CMD_SET_ESB_CHANNEL = 0x01;
const CMD_SET_CC_LAYER = 0x02;
const CMD_SET_MIDI_CHANNEL = 0x03;
const CMD_SET_BUTTON_MODE = 0x04;
const CMD_SAVE_TO_FLASH = 0xAA;

// --- UI Setup ---
// Populate MIDI Channel dropdown
for (let i = 1; i <= 16; i++) {
    const option = document.createElement('option');
    option.value = i - 1; // Send value 0-15
    option.textContent = `Channel ${i}`;
    midiChannelSelect.appendChild(option);
}

// --- Connection Logic ---
connectBtn.addEventListener('click', async () => {
    log.textContent = 'Awaiting device selection...\n';
    try {
        // Using your proven connection code that shows the prompt
        device = await navigator.usb.requestDevice({ filters: [] });
        
        await device.open();
        log.textContent = `Device Opened: ${device.productName}\n`;
        
        if (!device.configuration) {
            await device.selectConfiguration(1);
        }

        // --- IMPORTANT PART FOR COMPOSITE DEVICES ---
        // Your device is both MIDI and WebUSB. This means it has multiple "interfaces".
        // Interface 0 is very likely the MIDI one. The WebUSB interface is probably on a higher number.
        // We will try Interface 2, as it's a common choice.
        // If it fails here, try changing this to 1, 3, or another number.
        const interfaceNumber = 2;
        await device.claimInterface(interfaceNumber);
        log.textContent += `Successfully claimed interface ${interfaceNumber}.\nReady to save settings.`;
        
        // Show the settings form and hide the connect button
        settingsForm.style.display = 'block';
        connectBtn.style.display = 'none';

    } catch (err) {
        log.textContent += `Error: ${err.toString()}`;
    }
});

// --- Save Settings Logic ---
saveBtn.addEventListener('click', async () => {
    if (!device) {
        log.textContent = 'Error: No device connected.';
        return;
    }

    log.textContent = 'Saving settings...';
    try {
        const esbChannel = parseInt(document.getElementById('esb-channel').value);
        const ccLayer = parseInt(document.getElementById('cc-layer').value);
        const midiChannel = parseInt(document.getElementById('midi-channel').value);
        const buttonMode = parseInt(document.getElementById('button-mode').value);

        // --- IMPORTANT PART FOR DATA TRANSFER ---
        // Like the interface, the "endpoint" for sending data must match the WebUSB interface.
        // Endpoint 2 is a common choice for a secondary OUT endpoint.
        // If saving fails, this number might also need to be changed (e.g., to 1, 3, etc.)
        const endpointNumber = 2;

        // Send each setting as a separate 2-byte command packet
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_ESB_CHANNEL, esbChannel]));
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_CC_LAYER, ccLayer]));
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_MIDI_CHANNEL, midiChannel]));
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_BUTTON_MODE, buttonMode]));
        
        // Send the final command to save everything to flash (this should blink the LED)
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SAVE_TO_FLASH, 0x00]));

        log.textContent = 'Settings saved successfully! The LED on the device should have flashed.';

    } catch (err) {
        log.textContent = `Error during save: ${err.toString()}`;
    }
});
