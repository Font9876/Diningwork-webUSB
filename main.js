// This script is built from your working "old js" connection logic.

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

// --- Connection Logic ---
connectBtn.addEventListener('click', async () => {
    log.textContent = 'Awaiting device selection...\n';
    try {
        device = await navigator.usb.requestDevice({ filters: [] });
        await device.open();
        log.textContent = `Device Opened: ${device.productName}\n`;
        
        if (!device.configuration) {
            await device.selectConfiguration(1);
        }

        // --- NEW: Smart Interface Finding Logic ---
        log.textContent += 'Searching for the correct WebUSB interface...\n';
        let foundInterface = false;

        // Loop through all available interfaces on the device
        for (const config of device.configurations) {
            for (const iface of config.interfaces) {
                log.textContent += `> Checking Interface #${iface.interfaceNumber}...\n`;
                // Try to claim this interface. If it's the protected MIDI one, it will throw an error.
                try {
                    await device.claimInterface(iface.interfaceNumber);
                    
                    // If we get here, we've successfully claimed an interface!
                    // Now, find its OUT endpoint for sending data.
                    const endpoint = iface.alternate.endpoints.find(e => e.direction === 'out');
                    if (!endpoint) {
                        // This interface has no OUT endpoint, so it's not the one we want. Unclaim it.
                        log.textContent += `  - Interface #${iface.interfaceNumber} has no OUT endpoint. Unclaiming and continuing...\n`;
                        await device.releaseInterface(iface.interfaceNumber);
                        continue;
                    }

                    // We found it! Store the numbers and stop searching.
                    webUsbInterface.interfaceNumber = iface.interfaceNumber;
                    webUsbInterface.endpointNumber = endpoint.endpointNumber;
                    
                    log.textContent += `> SUCCESS! Claimed non-protected WebUSB interface #${webUsbInterface.interfaceNumber} with OUT endpoint #${webUsbInterface.endpointNumber}.\n`;
                    foundInterface = true;
                    break; // Exit the inner loop
                    
                } catch (err) {
                    // This error is EXPECTED for the MIDI interface.
                    log.textContent += `  - Could not claim Interface #${iface.interfaceNumber} (likely the protected MIDI interface). Skipping.\n`;
                }
            }
            if (foundInterface) break; // Exit the outer loop
        }

        if (!foundInterface) {
            throw new Error("Could not find and claim a valid WebUSB interface. Please check the device firmware.");
        }
        
        // Show the settings form and hide the connect button
        log.textContent += 'Ready to save settings.';
        settingsForm.style.display = 'block';
        connectBtn.style.display = 'none';

    } catch (err) {
        log.textContent += `\nError: ${err.toString()}`;
    }
});

// --- Save Settings Logic ---
saveBtn.addEventListener('click', async () => {
    if (!device || webUsbInterface.interfaceNumber === -1) {
        log.textContent = 'Error: No device or valid interface found.';
        return;
    }

    log.textContent = 'Saving settings...';
    try {
        const esbChannel = parseInt(document.getElementById('esb-channel').value);
        const ccLayer = parseInt(document.getElementById('cc-layer').value);
        const midiChannel = parseInt(document.getElementById('midi-channel').value);
        const buttonMode = parseInt(document.getElementById('button-mode').value);

        // Use the endpoint number we found during connection
        const endpointNumber = webUsbInterface.endpointNumber;

        // Send all the command packets
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_ESB_CHANNEL, esbChannel]));
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_CC_LAYER, ccLayer]));
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_MIDI_CHANNEL, midiChannel]));
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SET_BUTTON_MODE, buttonMode]));
        await device.transferOut(endpointNumber, new Uint8Array([CMD_SAVE_TO_FLASH, 0x00]));

        log.textContent = 'Settings saved successfully! The LED on the device should have flashed.';

    } catch (err) {
        log.textContent = `Error during save: ${err.toString()}`;
    }
});
