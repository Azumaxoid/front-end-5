const fs = require('fs')
    , axios = require('axios')

async function get() {
const res = await axios({
  method: 'get',
  url: 'https://api.newrelic.com/v2/browser_applications.json',
  headers: {
    "X-Api-Key": "NRAK-6D8ODJUV2P26FO9YZXXF02LGMEE",
    "Content-Type": "application/json",
  },
  data: {
    "browser_application": {
      "name": "k8s-front-end"
    }
  }
});
console.log(res.data);
fs.writeFileSync(`newrelicagent.txt`, res.data.browser_applications[0].loader_script);
}
function test(){
var nragent = fs.readFileSync(`newrelicagent.txt`).toString();
fs.readdir('src/', function(err, files){
    if (err) throw err;
    files.filter((fileName)=>{
      return fileName.endsWith('.html');
    }).forEach(function (fileName) {
      var srcTxt = fs.readFileSync(`src/${fileName}`).toString();
      var destTxt = srcTxt.replace('<title>', nragent + '<title>');
      fs.writeFileSync(`public/${fileName}`, destTxt);
    });
});
}
//get()
test()
