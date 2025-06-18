// New Sanity Check Script - Merging your working connection logic

const log = document.getElementById('log');
const connectBtn = document.getElementById('connect');

connectBtn.addEventListener('click', async () => {
  log.textContent = 'Button clicked. Requesting device...\n';
  
  // 1. Using YOUR working connection logic
  try {
    const device = await navigator.usb.requestDevice({ filters: [] });
    log.textContent += `-> Device selected: ${device.productName}\n`;
    
    await device.open();
    log.textContent += '-> Device opened.\n';

    if (!device.configuration) {
      log.textContent += '-> Selecting configuration 1...\n';
      await device.selectConfiguration(1);
    }
    log.textContent += `-> Configuration selected: ${device.configuration.configurationValue}\n`;

    // 2. Try to claim the interface and send a test command
    // We will try to claim Interface 2, a common spot for a secondary function like WebUSB.
    // The MIDI interface is likely Interface 0 or 1.
    const interfaceNumber = 2; 
    log.textContent += `-> Claiming interface ${interfaceNumber}...\n`;
    await device.claimInterface(interfaceNumber);
    log.textContent += `-> Interface ${interfaceNumber} claimed.\n`;

    // The "Save" command (0xAA) is programmed to blink the LED on your device.
    // This is a perfect test to see if communication is working.
    // Endpoint 2 is a common OUT endpoint number for a secondary interface.
    const endpointNumber = 2; 
    const testCommand = new Uint8Array([0xAA, 0x00]); 
    
    log.textContent += `-> Sending test command [0xAA, 0x00] to endpoint ${endpointNumber}...\n`;
    await device.transferOut(endpointNumber, testCommand);
    
    log.textContent += '-> TEST SUCCEEDED! Command sent. Did the LED on your device blink?\n';

  } catch (err) {
    log.textContent += `\n--- ERROR ---\n${err.toString()}`;
    log.classList.add('error');
  }
});
