export default function () {
  window.plugins.flashlight.available(function (isAvailable) {
    if (isAvailable) {
      window.plugins.flashlight.switchOff()
    } else {
      alert('Flashlight not available on this device')
    }
  })
}