const log = document.getElementById('log');
document.getElementById('connect').addEventListener('click', async () => {
  try {
    const device = await navigator.usb.requestDevice({ filters: [{vendorId: 0x239A}] });
    await device.open();
    if (!device.configuration) await device.selectConfiguration(1);
    await device.claimInterface(0);
    log.textContent += `Connected: ${device.productName}\n`;
  } catch (err) {
    log.textContent += `Error: ${err}\n`;
  }
});
