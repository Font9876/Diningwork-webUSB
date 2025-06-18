// This script intelligently finds the correct, non-protected interface.

const log = document.getElementById('log');
const connectBtn = document.getElementById('connect');
const saveBtn = document.getElementById('save-btn');
const settingsForm = document.getElementById('settings-form');
const midiChannelSelect = document.getElementById('midi-channel');

let device = null;
let webUsbInterface = { interfaceNumber: -1, endpointNumber: -1 };

// --- Command Protocol and UI Setup (same as before) ---
// [This part is identical to the previous script]

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

        // --- Smart Interface Finding Logic ---
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
                    
                    log.textContent += `> SUCCESS! Claimed non-protected WebUSB interface #${webUsbInterface.interfaceNumber}.\n`;
                    foundInterface = true;
                    break;
                    
                } catch (err) {
                    log.textContent += `  - Could not claim Interface #${iface.interfaceNumber} (This is likely the protected MIDI interface. This is NORMAL.).\n`;
                }
            }
            if (foundInterface) break;
        }

        if (!foundInterface) {
            throw new Error("Could not find and claim a valid WebUSB interface.");
        }
        
        log.textContent += 'Ready to save settings.';
        settingsForm.style.display = 'block';
        connectBtn.style.display = 'none';

    } catch (err) {
        log.textContent += `\nError: ${err.toString()}`;
    }
});

// --- Save Settings Logic (same as before) ---
// [This part is identical to the previous script]
