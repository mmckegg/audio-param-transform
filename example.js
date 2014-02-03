var audioContext = new webkitAudioContext()

var extend = require('./index')

var oscillator = audioContext.createOscillator()
var gain = audioContext.createGain()
gain.gain.value = 0.4

oscillator.start(0)

extend(oscillator.frequency, audioContext)

var baseFrequency = oscillator.frequency.transform()
var transposeParam = oscillator.frequency.transform(transpose)

oscillator.connect(gain)
gain.connect(audioContext.destination)

addButton('set base to 880', function(){
  baseFrequency.value = 880
})

addButton('set base to 440', function(){
  baseFrequency.value = 440
})

addButton('ramp to +12 (2s)', function(){
  transposeParam.linearRampToValueAtTime(12, audioContext.currentTime + 2)
})

addButton('transpose by +24', function(){
  transposeParam.cancelScheduledValues(0)
  transposeParam.value = 24
})

addButton('transpose by -12', function(){
  transposeParam.cancelScheduledValues(0)
  transposeParam.value = -12
})

addButton('transpose by +5', function(){
  transposeParam.cancelScheduledValues(0)
  transposeParam.value = 5
})

addButton('reset transpose', function(){
  transposeParam.cancelScheduledValues(0)
  transposeParam.value = 0
})

addButton('modulate octave', function(){
  // modulate the transpose up an octave then down again each second
  var on = false
  transposeParam.linearRampToValueAtTime(12, audioContext.currentTime + 0.3)
  setInterval(function(){
    if (on){ // ramp up
      transposeParam.linearRampToValueAtTime(12, audioContext.currentTime + 0.3)
    } else { // and back again
      transposeParam.linearRampToValueAtTime(0, audioContext.currentTime + 0.3)
    }
    on = !on
  }, 1000)
})

addButton('modulate frequency', function(){
  // modulate the transpose up an octave then down again each second
  var on = false
  baseFrequency.exponentialRampToValueAtTime(460, audioContext.currentTime + 0.3)
  setInterval(function(){
    if (on){ // ramp up
      baseFrequency.linearRampToValueAtTime(460, audioContext.currentTime + 0.3)
    } else { // and back again
      baseFrequency.linearRampToValueAtTime(430, audioContext.currentTime + 0.3)
    }
    on = !on
  }, 300)
})

function transpose(a,b){
  return a * Math.pow(2, (b || 0) / 12)
}

function addButton(name, func){
  var button = document.createElement('button')
  button.onclick = func
  button.textContent = name
  document.body.appendChild(button)
}