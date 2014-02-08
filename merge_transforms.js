module.exports = mergeTransforms

function mergeTransforms(transforms, from, to, step){

  var duration = to - from
  var steps = step ? duration / step : 1

  var transformCount = transforms.length
  var result = new Float32Array(steps)

  var pending = []

  // consolidate and interpolate
  for (var i=0;i<transforms.length;i++){
    var state = transforms[i]
    var events = []
    for (var x=0;x<state.events.length;x++){
      var event = state.events[x]
      if (event.to >= from){
        event.scheduled = true
        events.push(event)
      }
    }
    pending[i] = consolidate(getValueAt(from, state), events, from, to, step)
  }

  if (transforms.length === 1 && !transforms[0].operation){ // no need to run anything
    result = pending[0]
  } else {

    for (var i=0;i<steps;i++){
      var value = null

      for (var x=0;x<transformCount;x++){
        var op = transforms[x].operation
        value = op ? op(value, pending[x][i]) : pending[x][i]
      }

      result[i] = value
    }

  }

  return result
}

function consolidate(startValue, events, from, to, step){

  var duration = to - from

  var steps = step ? duration / step : 1
  var curve = new Float32Array(steps)

  var start = 0
  var end = 0
  var lastValue = startValue

  // write curves
  if (events) {
    for (var i=0;i<events.length;i++){

      var event = events[i]

      var offset = step ? Math.floor((event.from - from) / step) : 0
      var scale = (event.step && step) ? event.step / step : 1

      var newLength = Math.floor(steps * scale)

      if (offset > start){
        start = offset
      }

      if ((newLength + offset) > end){
        end = newLength + offset
        lastValue = event.curve[event.curve.length-1]
      }

      if (event.step === step && offset>=0 && event.curve.length + offset <= curve.length){
        curve.set(event.curve, offset)
      } else { // rescale if step doesn't match
        for (var x=0,l=newLength;x<l;x++){
          var pos = x+Math.max(0, offset)
          var xi = Math.floor(x / scale) - Math.min(0, offset)
          curve[pos] = event.curve[xi]
        }
      }
    }
  }



  // fill remaining
  for (var i=0;i<start;i++){
    curve[i] = startValue
  }

  for (var i=end;i<steps;i++){
    curve[i] = lastValue
  }

  return curve
}

function getValueAt(time, state){
  if (!time || state.cleanTo > time){
    return state.value
  } else {
    var lastValue = state.value
    var highestTime = 0
    for (var i=state.events.length-1;i>=0;i--){
      var event = state.events[i]
      
      if (event.to > time && event.from < time && event.step ){
        var offset = Math.floor((time - event.from) / event.step)
        lastValue = event.curve[offset]
        break
      }

      if (event.to < time && !event.cancel && event.to > highestTime){
        highestTime = event.to
        lastValue = event.value
      }
    }
    return lastValue
  }
}