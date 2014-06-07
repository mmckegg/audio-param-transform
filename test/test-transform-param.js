var TransformParam = require('../transform_param')
var context = {currentTime: 0, sampleRate: 48000}

function cb(start, end){
  console.log('Schedule:', {start: start, end: end})
}

var param = TransformParam(context, cb)
param.value = 10

context.currentTime = 100
param.value = 20

var curve = param.generateCurveRange(100-0.001, 100+0.001)
console.log(toArray(curve))

function toArray(arr){
  return Array.prototype.slice.call(arr)
}