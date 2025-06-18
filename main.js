// This script includes detailed logging for the Save function.

// --- HTML Elements ---
const log = document.getElementById('log');
const connectBtn = document.getElementById('connect');
const saveBtn = document.getElementById('save-btn');
const settingsForm = document.getElementById('settings-form');
const midiChannelSelect = document.getElementById('midi-channel');

// This variable will hold the connected device object
let device = null;
// This will hold the numbers for the WebUSB interface and endpoint
let webUsbInterface = { interfaceNumber: -1, endpointNumber: -1 };

// --- Command Protocol Definition (must match Arduino code) ---
const CMD_SET_ESB_CHANNEL = 0x01;
const CMD_SET_CC_LAYER = 0x02;
const CMD_SET_MIDI_CHANNEL = 0x03;
const CMD_SET_BUTTON_MODE = 0x04;
const CMD_SAVE_TO_FLASH = 0xAA;

// --- UI Setup ---
for (let i = 1; i <= 16; i++) {
    const option = document.createElement('option');
    option.value = i - 1;
    option.textContent = `Channel ${i}`;
    midiChannelSelect.appendChild(option);
}

// --- Connection Logic (This part is now working correctly) ---
connectBtn.addEventListener('click', async () => {
    log.textContent = 'Awaiting device selection...\n';
    try {
        device = await navigator.usb.requestDevice({ filters: [] });
        await device.open();
        log.textContent = `Device Opened: ${device.productName}\n`;
        
        if (!device.configuration) {
            await device.selectConfiguration(1);
        }

        log.textContent += 'Searching for the correct WebUSB interface...\n';
        let foundInterface = false;

        for (const config of device.configurations) {
            for (const iface of config.interfaces) {
                log.textContent += `> Checking Interface #${iface.interfaceNumber}...\n`;
                try {
                    await device.claimInterface(iface.interfaceNumber);
                    
                    const endpoint = iface.alternate.endpoints.find(e => e.direction === 'out');
                    if (!endpoint) {
                        log.textContent += `  - Interface #${iface.interfaceNumber} has no OUT endpoint. Unclaiming...\n`;
                        await device.releaseInterface(iface.interfaceNumber);
                        continue;
                    }

                    webUsbInterface.interfaceNumber = iface.interfaceNumber;
                    webUsbInterface.endpointNumber = endpoint.endpointNumber;
                    
                    log.textContent += `> SUCCESS! Claimed WebUSB interface #${webUsbInterface.interfaceNumber} with OUT endpoint #${webUsbInterface.endpointNumber}.\n`;
                    foundInterface = true;
                    break;
                    
                } catch (err) {
                    log.textContent += `  - Could not claim Interface #${iface.interfaceNumber} (This is the protected MIDI interface. This is NORMAL.).\n`;
                }
            }
            if (foundInterface) break;
        }

        if (!foundInterface) {
            throw new Error("Could not find and claim a valid WebUSB interface. Please check the device firmware.");
        }
        
        log.textContent += 'Ready to save settings.';
        settingsForm.style.display = 'block';
        connectBtn.style.display = 'none';

    } catch (err) {
        log.textContent += `\nError: ${err.toString()}`;
    }
});

// --- Save Settings Logic (NEW: With detailed logging) ---
saveBtn.addEventListener('click', async () => {
    if (!device || webUsbInterface.interfaceNumber === -1) {
        log.textContent = 'Error: No device or valid interface found.';
        return;
    }

    log.textContent = 'Save button clicked. Preparing to send data...\n';
    try {
        const esbChannel = parseInt(document.getElementById('esb-channel').value);
        const ccLayer = parseInt(document.getElementById('cc-layer').value);
        const midiChannel = parseInt(document.getElementById('midi-channel').value);
        const buttonMode = parseInt(document.getElementById('button-mode').value);

        const endpointNumber = webUsbInterface.endpointNumber;
        log.textContent += `Using OUT endpoint #${endpointNumber} to send data.\n\n`;

        log.textContent += `1. Sending ESB Channel [${CMD_SET_ESB_CHANNEL}, ${esbChannel}]... `;
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_ESB_CHANNEL, esbChannel]));
        log.textContent += `OK\n`;
        
        log.textContent += `2. Sending CC Layer [${CMD_SET_CC_LAYER}, ${ccLayer}]... `;
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_CC_LAYER, ccLayer]));
        log.textContent += `OK\n`;

        log.textContent += `3. Sending MIDI Channel [${CMD_SET_MIDI_CHANNEL}, ${midiChannel}]... `;
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_MIDI_CHANNEL, midiChannel]));
        log.textContent += `OK\n`;

        log.textContent += `4. Sending Button Mode [${CMD_SET_BUTTON_MODE}, ${buttonMode}]... `;
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_BUTTON_MODE, buttonMode]));
        log.textContent += `OK\n`;
        
        log.textContent += `5. Sending FINAL Save Command [${CMD_SAVE_TO_FLASH}, 0]... `;
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SAVE_TO_FLASH, 0x00]));
        log.textContent += `OK\n\n`;

        log.textContent += 'SUCCESS! All commands sent. The LED on the device should have flashed.';

    } catch (err) {
        log.textContent += `\n\n--- ERROR DURING SAVE ---\n${err.toString()}`;
    }
});
