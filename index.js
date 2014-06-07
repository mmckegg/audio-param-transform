var Scheduler = require('./scheduler')
var TransformParam = require('./transform_param')

module.exports = function extend(param, audioContext){
  if (!param.transform){
    param._transforms = []
    param.context = audioContext
    param.transform = transform
    param.scheduler = Scheduler(param.context, Math.pow(2,10), doSchedule.bind(param))
    param._transformCallback = param.scheduler.scheduleRange.bind(param.scheduler)
  }
  return param
}

function transform(operation, defaultValue){ // bound to AudioParam
  var param = this

  if (typeof defaultValue != 'number' && typeof operation === 'number'){
    defaultValue = operation
    operation = null
  }

  if (typeof defaultValue != 'number' && !operation){
    defaultValue = param.defaultValue
  }

  var transform = TransformParam(this.context, defaultValue, param._transformCallback)
  transform.operation = operation
  param._transforms.push(transform)
  return transform
}

function doSchedule(from, to){
  var param = this
  var duration = to - from
  var steps = Math.max(1, Math.floor(duration * param.context.sampleRate))
  var defaultValue = param.defaultValue

  var curve = new Float32Array(steps)

  var curves = []

  for (var i=0;i<param._transforms.length;i++){
    var transform = param._transforms[i]
    curves[i] = transform.generateCurveRange(from, to)
  }

  for (var i=0;i<steps;i++){
    var value = defaultValue
    for (var x=0;x<param._transforms.length;x++){
      var transform = param._transforms[x]
      if (transform.operation){
        value = transform.operation(value, curves[x][i])
      } else {
        value = curves[x][i]
      }
    }
    curve[i] = value
  }

  if (steps === 1){
    param.setValueAtTime(curve[0], from)
  } else if (steps > 1) {
    param.setValueCurveAtTime(curve, from, duration)
  }
}