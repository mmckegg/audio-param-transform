var APT = require( '../transform_param' )

suite( 'audio-transform', function() {
  
  var start = 0.546
  var pos = 0.876543
  var target = {
    type: 'transform_param',
    value: 0.10324789,
    timeConstant: 2,
  }
  
  bench( 'interpolate->linearRamp', function() {
    target.type = 'linearRamp'
    APT.interpolate( start, target, pos )
  })
  
  bench( 'interpolate->exponentialRamp', function() {
    target.type = 'exponentialRamp'
    APT.interpolate( start, target, pos )
  })
  
  bench( 'interpolate->target', function() {
    target.type = 'target'
    APT.interpolate( start, target, pos )
  })
  
  bench( 'interpolate->valueCurve', function() {
    target.type = 'valueCurve'
    target.value = [ 0, 12345.45678 ]
    APT.interpolate( start, target, pos )
  })
  
})
