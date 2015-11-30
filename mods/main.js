define(function(require, exports, module) {
  console.log('main mods');

  /*var img = require("http://p2.qhimg.com/t01dd5e839f1597aae2.png", function(arg) {
    console.log(arg);
    //document.body.appendChild(arg);
  });
  var img = require("http://p2.qhimg.com/t01dd5e839f1597aae2.png");
  document.body.appendChild(img);*/
  var Computer = require('./computer');
  console.log(Computer);

  require.async('mods/obj', function(b) {
    console.log(b)
  });

var md5 = require('mods/md5');

 /* var obj = require('mods/obj');
  console.log(obj)*/

  var Printer = require('mods/printer');
  var printer = new Printer;
  printer.echo('this is printer')

  var str = require('mods/str');
  console.log(str)



  var util = require('mods/util');
    console.log(util.multify(6,3))

  var computer = new Computer;

  var sum = computer.add(5, 4);
  printer.echo(sum)



  /*  var Person = require('mods/person');
      var p = new Person;
      p.output('I am person object');*/


  var Person = require('mods/point');


  var util = require('mods/sub/cla');
  debugger;
 var html = require('./tmpl.html');
      console.log(html)
    /*      var tpl = require('mods/tmpl.tpl');
      console.log(tpl);
      var text = require('text!mods/tmpl.txt');
      console.log(text);*/


  /* require('mods/style.css',function(){
          console.log('load css style')
      });*/

  var testcss = require('mods/style.css');
     /* var teststyle = require("#testcssText{color:blue;font-size:20px;width:200px;height: 30px;  border: 1px solid red;}");*/

  return {
    name: 'main'
  }
}),
define('mods/tmpl.html',[],'this is online tmpl string.')