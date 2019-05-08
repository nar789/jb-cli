var exec = require('child_process').execSync;
var program = require('commander');
var fs = require('fs');
var chalk=require('chalk');
var inquirer = require('inquirer');
const log = console.log;
var request = require('request');
var path = require('path');
var root=path.resolve(process.execPath, '../jbroot');
var aids={};



var config={
  email:"",
  server:"",
};

program
  .version('JB-cli@1.0.9','-v,--version')
  .usage('[command] [options]')
  .description(`This is ${chalk.bgGreen('JB-cli')}@1.0.7 tool for ${chalk.bgBlue('Samsung')} google approval team. Desgined by ${chalk.underline.bgCyan('jh0511.lee(feat. sujin7891.oh)')}`);
  
program
  .command('set [options]')
  .usage('[options]')
  .option('-e,--email <email>','이메일 입력').option('-s,--server <server>','서버 ip주소 입력')
  .description(`사용자 정보 입력\n
    예: jb set -e son0708@samsung.com -s 10.253.93.42:2323\n`)
  .action(function(env,opt){
    if(!opt || !opt.server || !opt.email){
      console.log('이메일정보와 서버주소를 입력해주세요. (참고 : jb set -h)'); 
      return;
    }
    var j={};
    j.email=opt.email;
    j.server=opt.server;
    j=JSON.stringify(j);
    !fs.existsSync(root) && fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, '/config.json'),j,'utf8');

    console.log(`
      [${chalk.green('\u2713')}] 사용자 설정 완료.
      `);
    
  });


program
  .command('check').usage('[phone]').description(`시료 등록 확인\n
    예: jb check\n`)
  .action(function(phone,opt){
    if(!init())return;
    check(()=>{
      log(`
          [${chalk.green('\u2713')}] ${aids.length}대 등록 확인 완료.
        `);
    });
  });


program
  .command('add').usage('[phone]').description(`시료 등록\n
    예: jb add\n`)
  .action(function(phone,opt){
    if(!init())return;
    add_phone_none();
  });

program
  .command('use').usage('[phone]').description(`시료 대여\n
    예: jb use\n`)
  .action(function(phone,opt){
    if(!init())return;
    check(rental);
  });

program
  .command('ret').usage('[phone]').description(`시료 반납\n
    예: jb ret\n`)
  .action(function(phone,opt){
    if(!init())return;
    check(asset_return);
  });


  program.parse(process.argv);

  if(program.args.length===0){
    log(path.join(root, '/config.json'));
    program.help();
  }
   
/*
var child = exec("adb shell getprop", function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
        console.log('exec error: ' + error);
    }
});*/

  

  function init(){
    if(!load_config())
      return false;
    else return true;
  }
  //init();

  function load_config(){
    var r;
    try{

        r=fs.readFileSync(path.join(root, '/config.json'),'utf8');
      }catch(err){
        log(`
            사용자 설정을 해주십시오. (참고 : jb set -h)
          `);
        return false;
      }
      r=JSON.parse(r);
      config.email=r.email;
      config.server=r.server;
      var e=r.email.split('@');
      log(`
          [${chalk.green('\u2713')}] ${(e[0])}@${config.server} is logined.
        `);
      return true;
  }

  function getdevices(){ //return array of serials;
    var ret=[];
    var out = exec("adb devices");
    out=String(out);
    out=out.split('\n');
    for(var i=1;i<out.length;i++)
    {
      if(out[i].length<2)break;
      var t=out[i].split('\t');
      ret.push(t[0]);
    }
    return ret;
  }

  function getprop(s){ //return model,serial,sales
    var info={};
    var prop=["ro.product.model","ro.csc.sales_code","ril.serialnumber","ro.serialno","ro.boot.em.model","ro.boot.sales"];
    var val=["","","","","",""];
    var out = exec(`adb -s ${s} shell getprop`);
    out=String(out);
    out=out.split('\n');
    for(var i=0;i<out.length;i++)
    {
      c=out[i].split(':');
      str=c[0].substring(1,c[0].length-1);
      for(var j=0;j<prop.length;j++)
      {
        if(str==prop[j])
        {
          var str2=c[1].trim();
          str2=str2.substring(1,str2.length-1);
          val[j]=str2;
        }
      }
      
    }
    info.prop=prop;
    info.val=val;
    log(info);
    return info;
  }

  function brightlow(s){
    exec(`adb -s ${s} shell settings put system screen_brightness_mode 0`);
    exec(`adb -s ${s} shell settings put system screen_brightness 50`);
  }

  function brighthigh(s){
    exec(`adb -s ${s} shell settings put system screen_brightness_mode 0`);
    exec(`adb -s ${s} shell settings put system screen_brightness 200`);
  }

  function bright_all_low(ss)
  {
    for(var i=0;i<ss.length;i++){
      exec(`adb -s ${ss[i]} shell service call statusbar 2`);
    }
  }

  function blink(s){
    exec(`adb -s ${s} shell service call statusbar 1`);
  }


  

  function add_phone_none(){
    var ds=getdevices();
    if(ds.length==0)
    {
      log(`
        No connect devices. Please check 'adb devices'
        `);
      return;
    }
    bright_all_low(ds);

    var questions = [
      {
        type:'list',
        name:'serial',
        message:'디바이스를 선택해주세요.',
        choices:[],
        filter:function(val){
          blink(val);
          return val;
        },
      },
      {
        type:'input',
        name:'label',
        message:'[1/2] 해당 시료의 라벨을 입력해주세요. ',
        filter:function(val){
          return val.toUpperCase();
        }
      },
      {
        type:'input',
        name:'barcode',
        message:'[2/2] 해당 시료의 바코드를 찍어주세요~! ',
        filter:function(val){
          return val.toLowerCase();
        },
      },
    ];
    for(var i=0;i<ds.length;i++)
    {
      questions[0].choices.push(ds[i]);
    }
    inquirer.prompt(questions).then(answers=>{
      var info=getprop(answers.serial);
      info.label=answers.label;
      info.barcode=answers.barcode;
      var aosp_check=false;
      if(info.val[0].indexOf('AOSP')>=0)
      {
        aosp_check=true;
      }
      var m=info.val[4];
      var s=info.val[1];
      if(aosp_check)
        s=info.val[5];
      var n=info.val[2]+','+info.val[3]+','+info.barcode;
      var l=info.label;

      request(
        { 
            uri: "http://"+config.server+"/api/phone/crud", 
            method: "POST", 
            form: { 
                cmd:'create',
                model:m,
                sales:s,
                nick:n,
                label:l,
              } 
         }, function(err, res, body) {
            if(!err){
                if(body==="success"){
                  log(`
                      [${chalk.green('\u2713')}] ${m+" "+l} 가 성공적으로 등록되었습니다.
                    `);
                }else{
                  log(`
                      ${m+" "+l} 등록에 실패했습니다.
                    `);
                }
              }else
              {
                log(err);
              }
         } 
      );


    });
  }


function sleep (delay) {
   var start = new Date().getTime();
   while (new Date().getTime() < start + delay);
}

function check_http(ds,i,all,callback)
{
   request(
            { 
                uri: "http://"+config.server+"/api/phone/crud", 
                method: "POST", 
                form: { 
                    cmd:'check',
                    serial:ds[i],
                  } 
             }, function(err, res, body) {
                if(!err){
                    if(body!="fail"){
                      aids.push(parseInt(body));
                      log(`
            ${ds[i]} ${chalk.green('is registered.')} ID:${body}
                        `);
                    }else{
                      all=false;
                      log(`
            ${ds[i]} ${chalk.red('is not registered.')}
                        `);
                    }
                    if(i!=ds.length-1)
                      check_http(ds,i+1,all,callback)
                    else
                    {
                      if(all===true)
                        callback();
                      else
                        log('서버에 등록되지 않은 시료가 있습니다. 시료를 등록해주세요. (참고 : jb add -h)')
                    }
                  }else
                  {
                    log(err);
                  }
             } 
    );
}



  function check(callback){
    var ds=getdevices();
    if(ds.length==0)
    {
      log(`
        No connect devices. Please check 'adb devices'
        `);
      return;
    }
    aids=[];
    check_http(ds,0,true,callback);
    
  }



  function rental_http(ds,type)
  {
    request(
            { 
                uri: "http://"+config.server+"/api/cli/rental", 
                method: "POST", 
                form: { 
                    aids:aids,
                    type:type,
                    email:config.email,
                  } 
             }, function(err, res, body) {
                if(!err){
                    if(body==="success"){
                      var type_str;
                      if(type==1)type_str='대여';
                      else if(type==2)type_str='반납';

                      log(`
          [${chalk.green('\u2713')}] ${aids.length}대 ${type_str+' 완료.'}
                        `);
                    }else{
                      all=false;
                      log(`
          [${chalk.green('\u2713')}] ${aids.length}대 ${type_str+' 실패했습니다..'}
                        `);
                    }
                    
                  }else
                  {
                    log(err);
                  }
             } 
    );
  }



  function rental(){
    var ds=getdevices();
    log(aids);
    rental_http(ds,1);
  }


  function asset_return(){
    var ds=getdevices();
    log(aids);
    rental_http(ds,2); 
  }