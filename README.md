audio-param-transform
===

Apply multiple transforms with custom functions to Web Audio API AudioParams.

## Install

```bash
$ npm install audio-param-transform
```

## API

```js
var extendTransform = require('audio-param-transform')
```

### extendTransform(audioParam, audioContext)

Pass in the AudioParam you wish to add a `transform()` method to and the relevant AudioContext.

Returns the extended param.

### param.transform(func)

Returns an instance of AudioParamTransform applied to the target AudioParam which works the same as the base AudioParam, except applying the specified `func(a, b)` to all values, ramps and curves.

If you do not specify a function, the specified value for this transform will override all previous transforms (if any).

### AudioParamTransform#setValueAtTime(value, at)

### AudioParamTransform#linearRampToValueAtTime(value, endTime)

### AudioParamTransform#exponentialRampToValueAtTime(value, endTime)

### AudioParamTransform#setValueCurveAtTime(float32ArrayCurve, at, duration)

### AudioParamTransform#cancelScheduledValues(from)

### AudioParamTransform#getValueAt(time)

## Example

Creating a transpose param.

```js
var extendTransform = require('audio-param-transform')

var audioContext = new webkitAudioContext()
var oscillator = audioContext.createOscillator()
oscillator.connect(audioContext.destination)


// create a base transform in case we want to automate the two independently
var baseFrequencyParam = oscillator.frequency.transform()

// now add the transpose transform
var transposeParam = oscillator.frequency.transform(transpose)

// modulate the transpose up an octave then down again each second
var on = false
setInterval(function(){
  if (on){ // ramp up
    transposeParam.linearRampToValueAtTime(12, audioContext.currentTime + 0.3)
  } else { // and back again
    transposeParam.linearRampToValueAtTime(0, audioContext.currentTime + 0.3)
  }
  on = !on
}, 1000)

function transpose(a,b){
  return a * Math.pow(2, (b || 0) / 12)
}
```