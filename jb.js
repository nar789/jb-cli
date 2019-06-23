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
  .version('JB-cli@1.4.2','-v,--version')
  .usage('[command] [options]')
  .description(`This is ${chalk.bgGreen('JB-cli')}@1.4.2 tool for ${chalk.bgBlue('Samsung')} google approval team. Desgined by ${chalk.underline.bgCyan('jh0511.lee(feat. sujin7891.oh)')}`);
  
program
  .command('set [options]')
  .usage('[options]')
  .option('-e,--email <email>','이메일 입력').option('-s,--server <server>','서버 ip주소 입력')
  .description(`사용자 정보 입력\n
    예: jb set -e son0708@samsung.com -s 10.253.93.42:2323\n`)
  .action(function(env,opt){
    if(!opt || !opt.server || !opt.email){
      //console.log('이메일정보와 서버주소를 입력해주세요. (참고 : jb set -h)'); 
      if(init())easy_set_config();
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
  .command('check').usage('[options]')
  .option('-f,--force <라벨명>','강제적인 시료 동기화')
  .description(`시료 등록 확인  /  사용예 : jb check\n`)
  .action(function(env,opt){
    if(!init())return;

    if(env.force!=undefined)
    {
      config.check_force=true;
      config.check_force_label=env.force;
    }

    
    /* v1.4.0 deprecated.

    check(()=>{
      log(`
          [${chalk.green('\u2713')}] ${aids.length}대 등록 확인 완료.
        `);
    });

    */
    //1.4.0 added.
    //1.4.2 add func. set_email.
    set_email(()=>{CheckRunProcess()});
    //
  });

/*
program
  .command('add').usage('[phone]').description(`시료 등록 ${chalk.bgRed('@deprecated')}  /  사용예 : jb add ${chalk.bgRed('@deprecated')}\n`)
  .action(function(phone,opt){
    if(!init())return;
    add_phone_none();
    
  });
  */

program
  .command('use').usage('[phone]').description(`시료 대여  /  사용예 : jb use\n`)
  .action(function(phone,opt){
    if(!init())return;
    set_email(()=>{check(rental)});
  });

program
  .command('ret').usage('[phone]').description(`시료 반납  /  사용예 : jb ret\n`)
  .action(function(phone,opt){
    if(!init())return;
    set_email(()=>{check(asset_return)});
  });

program
  .command('update').usage('[phone]').description(`시료 정보 업데이트  /  사용예: jb update\n`)
  .action(function(phone,opt){
    if(!init())return;
    //var imei=getimei('2318ac544f0c7ece');    
    //console.log(imei);
    
    set_email(()=>{update_info('update')});
    
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

  function getimei(sid)
  {
    var imei='';
    try{
      var out = exec(`adb -s ${sid} shell "service call iphonesubinfo 1"`);
    }catch(err)
    {
      log(err);
      return "000000000000000";
    }
    out=String(out);
    out=out.split(`'`);
    var g=[];
    for(var i=0;i<out.length;i++)
    {
      if(out[i].indexOf('.')>=0)g.push(out[i]);
    }
    for(var i=0;i<g.length;i++)
    {
      var s=g[i].split('.');
      for(var j=0;j<s.length;j++)
      {
        if(!isNaN(s[j])==true)
          imei=imei+s[j];
      }
    }
    imei=imei.trim();
    //console.log(sid+" IMEI : "+imei);
    return imei;
  }

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
        //v1.4.0 deprecated
        /*
        log(`
            사용자 설정을 해주십시오. (참고 : jb set -h)
          `);
          */

        //v1.4.0 added.
        easy_set_config();

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

//v1.4.2 call my name func//
function set_email(callback){

    var questions = [
      {
        type:'input',
        name:'email',
        message:`
              아이디를 입력해주세요.
              ( @samsung.com를 생략하셔도 됩니다. )

              아이디 : `,
        default:config.email,
        filter:function(val){
          if(val===undefined)return;
          if(val.indexOf('@')<0){
            val=val+'@samsung.com';
          }
          return val;
        }
      },
    ];

    inquirer.prompt(questions).then(answers => {
      var email=answers.email;

      config.email=email;
      callback();
      
    }).catch(err=>{
      log(err);
    });

}

//v1.4.0 easy setting init--START
  function easy_set_config(){
      var questions = [
      {
        type:'input',
        name:'email',
        message:`
        [1/2] 아이디를 입력해주세요.
              ( @samsung.com를 생략하셔도 됩니다. )

              아이디 : `,
        filter:function(val){
          if(val===undefined)return;
          if(val.indexOf('@')<0){
            val=val+'@samsung.com';
          }
          return val;
        }
      },
      {
        type:'input',
        name:'server',
        message:`
        [2/2] 서버IP주소를 입력해주세요.
              (기본값 설정으로 엔터쳐서 넘어가셔도 됩니다.)

              서버IP주소 : `,
        default:'10.253.93.42:2323',
        filter:function(val){
          if(val===undefined)return;
          if(val=='')val='10.253.93.42:2323';
          return val;
        }
      },
    ];

    inquirer.prompt(questions).then(answers => {
      var email=answers.email;
      var server=answers.server;
      var j={};
      j.email=email;
      j.server=server;
      j=JSON.stringify(j);

      !fs.existsSync(root) && fs.mkdirSync(root);
      fs.writeFileSync(path.join(root, '/config.json'),j,'utf8');
      console.log(`
        [${chalk.green('\u2713')}] 사용자 설정 완료.
        `);
    }).catch(err=>{
      log(err);
    });
  }


//v1.4.0 easy setting init--END

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
    //log(info);
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


  function all_statusbar_up(ss)
  {
    for(var i=0;i<ss.length;i++){
      var s=ss[i].serial;
      s=s.split(',')[1];
      exec(`adb -s ${s} shell service call statusbar 2`);
    }
  }

  function statusbar_down(s)
  {
    s=s.split(',')[1];
    exec(`adb -s ${s} shell service call statusbar 1`);
  }




  /////////////////////v1.4.0 CHECK START///////////////////////////

  function CheckRunProcess()
  {
    var deviceDatas=GetDeviceData();
    if(deviceDatas.length>0){
      CheckOnDevice(deviceDatas,0);
    }else{
      log('No connected devices.');
    }
  }

  function CheckOnDevice(deviceDatas,i)
  {

    all_statusbar_up(deviceDatas);
    statusbar_down(deviceDatas[i].serial);

    serverData=getServerDataByKey(deviceDatas[i],

      (serverData,deviceData)=>{

        var isSufficient=false;
        
        if(serverData.exist){ isSufficient=isSufficientData(serverData); }
        
        ShowServerData(serverData,isSufficient);
        
        var physicalData={
          barcode:'',
          label:'',
        };

        var allData={};
        allData.serverData=serverData;
        allData.deviceData=deviceData;
        allData.physicalData=physicalData;

        AskPhysicalData(isSufficient,allData,(allData)=>{


          var reqData=combineData(allData);

          updateServerData(
            reqData,
            ()=>{
              log(`
                   [${chalk.green('\u2713')}] 서버와 동기화가 완료되었습니다.
                `);

              if(i!=deviceDatas.length-1)
              {
                CheckOnDevice(deviceDatas,i+1);
              }else{
                //all complete.
                all_statusbar_up(deviceDatas);
                log(`

          [${chalk.green('\u2713')}] 모든 기기의 동기화가 완료되었습니다. 감사합니다.

                `);
              }
            }//updateServerData->Callback
          );//updateServerData


        }); //AskPhysicalData
              

      }//getServerDataByKey->Callback
    );//getServerDataByKey
    
  }

  function updateServerData(reqData,callback){

    request(
      { 
          uri: "http://"+config.server+"/api/phone/crud", 
          method: "POST", 
          form: reqData,
       }, function(err, res, body) {
          if(!err){
            if(body==='success')
              callback();
            else{
              log(`
                   [${chalk.bgRed('!')}] 서버와 동기화에 실패했습니다.
                `);
            }
            
          }else
          {
            log(err);
          }
       } 
      );

  } 

  function combineData(allData){ //return reqData
    var ret={};
    //select device data;
    ret.model=allData.deviceData.model;
    ret.serial=allData.deviceData.serial.toLowerCase();
    ret.imei=allData.deviceData.imei;

    //sales exception  --START
    if(allData.serverData.sales == '' || allData.serverData.sales === undefined)
      ret.sales=allData.deviceData.sales;
    else
      ret.sales=allData.serverData.sales;
    //sales exception  --END

    //select server data if no physical data.
    if(allData.physicalData.barcode == '' || allData.physicalData.barcode === undefined)
      ret.barcode=allData.serverData.barcode;
    else
      ret.barcode=allData.physicalData.barcode;

    if(allData.physicalData.label == '' || allData.physicalData.label === undefined)
      ret.label=allData.serverData.label;
    else
      ret.label=allData.physicalData.label;


    //more data for request
    ret.email=config.email;
    ret.device_state='';
    ret.to_email='';
    ret.from_email='';
    ret.device_comment='';

    ret.cmd="create";
    
    return ret;    

  }
  
  function AskPhysicalData(isSufficient,allData,callback){ //ask barcode and label to user. // callback(d,s,p)

    //v1.4.2//check_force
    if(config.check_force==true)
    {
      allData.physicalData.barcode='';
      allData.physicalData.label=config.check_force_label;
      callback(allData);
      return;
    }

    if(isSufficient){
      callback(allData);
      return;
    }

    var questions = [
      {
        type:'input',
        name:'label',
        message:`
              [1/2] 상태바가 내려온 시료의 라벨을 입력해주세요.
              ( 예: CTS 1 , GTS 3 )
              ( 소문자는 자동으로 대문자로 변환됩니다. / 'CTS'는 'CTS/입고자료'로 자동 치환됩니다. )
        
              라벨 : `,
        filter:function(val){
          if(val===undefined)return;
          val=val.toUpperCase();
          
          //exception code on CTS CASE --START
          //
          if(val.indexOf('CTS-')<0 && val.indexOf('CTSI')<0 && val.indexOf('CTSV')<0 && val.indexOf('GSI')<0 )
            val=val.replace("CTS","CTS/입고자료");
          //
          //exception code on CTS CASE --END

          return val.toUpperCase();
        }
      },
      {
        type:'input',
        name:'barcode',
        message:`
              [2/2] 상태바가 내려온 시료의 바코드를 찍어주세요~!

              바코드 : `,
        filter:function(val){
          if(val===undefined)return;
          return val.toLowerCase();
        },
      },
    ];
    
    inquirer.prompt(questions).then(answers => {
      allData.physicalData.barcode=answers.barcode;
      allData.physicalData.label=answers.label;
      callback(allData);
    });

    

  }

  function ShowServerData(s,isSufficient){

    if(s.exist)
    {

      log(`
          모델이름 : ${s.model}
          사업자 : ${s.sales}
          시리얼번호 : ${s.nick}
          라벨 : ${s.label}
          IMEI : ${s.imei}
          바코드 : ${s.barcode}
        `);

      if(!isSufficient) //  Insufficient infor.
      {
        log(`
              [${chalk.bgRed('!')}] {바코드, 라벨} 대한 정보가 불충분해, {바코드, 라벨} 정보를 입력해주세요.
        `);
      }else{
      }

    }else{//not exist.
      log(`
              ${chalk.red('[!]')} 서버에서 정보를 찾을 수 없습니다. {바코드, 라벨} 정보를 입력해주세요.
        `);
    }
    

  }


  function getServerDataByKey(deviceData,callback) //callback(serverData,deviceData)
  {
    var serial=deviceData.serial.toLowerCase();
    var imei=deviceData.imei;

    request(
      { 
          uri: "http://"+config.server+"/api/phone/crud", 
          method: "POST", 
          form: { 
              cmd:'check_v2',
              serial:serial,
              imei:imei,
            } 
       }, function(err, res, body) {
          if(!err){
            var serverData={exist:false,};
            if(body!='fail')
            {
              serverData=JSON.parse(body);  
              serverData.exist=true;
            }
            callback(serverData,deviceData);
            
          }else
          {
            log(err);
          }
       } 
      );
  }

  function CheckValue(val)//return true or false;
  {
    if(val=='' || val===undefined || val.indexOf('no')>=0)return false;
    return true;
  }

  function isSufficientData(serverData)
  {
    //if(!CheckValue(serverData.model))return false;
    //if(!CheckValue(serverData.sales))return false;
    //if(!CheckValue(serverData.nick))return false;
    if(!CheckValue(serverData.label))return false;
    //if(!CheckValue(serverData.imei))return false;
    if(!CheckValue(serverData.barcode))return false;
    return true;
  }



  function GetDeviceData()
  {
    var serials=getdevices();
    var r=[];
    for(var i=0;i<serials.length;i++)
    {
      var prop=getprop(serials[i]);
      var imei=getimei(serials[i]);
      r.push(DataBuilder(prop,imei));
    }
    return r;
  }
  function DataBuilder(prop,imei)
  {
    var r={};
    var modelname=prop.val[4];
    if(modelname=='')modelname=prop.val[0];
    var serial=prop.val[2]+','+prop.val[3];
    var sales=prop.val[1];

    r.model=modelname;
    r.serial=serial;
    r.imei=imei;
    r.sales=sales;
    return r;
  }

  /////////////////////v1.4.0 CHECK END///////////////////////////




  function update_info_request(ds,i,cmd)
  {
      var imei=getimei(ds[i]);
      var info=getprop(ds[i]);
      var modelname=info.val[4];
      if(modelname=='')modelname=info.val[0];
      var n=info.val[2]+','+info.val[3];
      var sales=null;
      
      if(cmd=="add" || cmd=="use" )
      {
        //add는 sales가 시료를 받은 이후에 바뀔 수가 있기 때문에 update명령어를 통해서만 선택적으로 sales를 업데이트 할 수 있다.
      }else if(cmd=="update"){
        //update는 serial,model,sales를 기기에서 읽어와 바꿔준다.
        sales=info.val[1];
      }

      request(
      { 
          uri: "http://"+config.server+"/api/cli/update", 
          method: "POST", 
          form: { 
              nick:n,
              imei:imei,
              model:modelname,
              sales:sales,
            } 
       }, function(err, res, body) {
          if(!err){
              if(body==="success"){
                /*
                log(`
          [${chalk.green('\u2713')}] ${imei} 가 업데이트 처리가 완료되었습니다.
                  `);*/
              }else{
                log(`
          ${imei} 업데이트에 실패했습니다.
                  `);
              }

          }else
          {
            log(err);
          }
          if(ds.length-1!=i)            
            update_info_request(ds,i+1,cmd);
          else{
            log(`
          [${chalk.green('\u2713')}] 모든 기기의 업데이트 처리가 완료되었습니다.

                  `);
           } 
        }
      );
  }

  function for_each_ucl(ucl,i)
  {
      bright_all_low(ucl);
      blink(ucl[i]);
      var info=getprop(ucl[i]);
      var imei=getimei(ucl[i]);
      var modelname=info.val[4];
      if(modelname=='')modelname=info.val[0];
      var nick=info.val[2]+','+info.val[3];
      log(info+imei+modelname+nick);
           request(
          { 
              uri: "http://"+config.server+"/api/cli/getidbynoimei", 
              method: "POST", 
              form: { 
                  model:modelname,
                } 
           }, function(err, res, body) {
              if(!err){
                       var questions = [
                            {
                              type:'list',
                              name:'label',
                              message:'같은 라벨의 디바이스를 선택해주세요.',
                              choices:[],
                            },
                      ];

                    body=JSON.parse(body);
                    for(var j=0;j<body.length;j++)
                    {
                      var str=body[j].id+"   :   "+body[j].label;
                      questions[0].choices.push(str);
                    } 



                    inquirer.prompt(questions).then(answers=>{
                        var id=answers.label;
                        id=id.split(':');
                        id=id[0];

                    request(
                      { 
                          uri: "http://"+config.server+"/api/cli/update2", 
                          method: "POST", 
                          form: { 
                              id:id,
                              nick:nick,
                              imei:imei,
                            } 
                       }, function(err, res, body) {
                          if(!err){
                              if(body==="success"){
                                log(`
                                    [${chalk.green('\u2713')}] ${answers.label} 가 성공적으로 등록되었습니다.
                                  `);
                              }else{
                                log(`
                                    ${answers.label} 등록에 실패했습니다.
                                  `);
                              }
                            }else
                            {
                              log(err);
                            }
                            if(i!=ucl.length-1)
                            {
                              for_each_ucl(ucl,i+1);
                            }else
                              return;
                         }

                    );


                  });




                }else
                {
                  log(err);
                }
           } 
      );

  }

  function match_by_label()
  {
    var ucl=[];
    var ds=getdevices();
    get_uncheck_list(ds,0,ucl,()=>{
      console.log(ucl);
      log(`
            미매칭된 디바이스가 ${chalk.red(`${ucl.length}`)}개 있습니다.
                        `);


   
      if(ucl.length==0)return;
      for_each_ucl(ucl,0);


    });
  }


  function update_info(cmd)
  {
      var ds=getdevices();
      if(ds.length==0)
      {
        log(`
          No connect devices. Please check 'adb devices'
          `);
        return;
      }
      update_info_request(ds,0,cmd);




      //bright_all_low(ds);

  }

  function get_uncheck_list(ds,i,list,callback)
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
                        //aids.push(parseInt(body));
                        log(`
              ${ds[i]} ${chalk.green('is registered.')} ID:${body}
                          `);
                      }else{
                        log(`
              ${ds[i]} ${chalk.red('is not registered.')}
                          `);
                        list.push(ds[i]);
                      }
                      if(i!=ds.length-1)
                        get_uncheck_list(ds,i+1,list,callback)
                      else
                      {
                          callback();
                      }
                    }else
                    {
                      log(err);
                    }
               } 
      );
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
          if(val===undefined)return;
          return val.toUpperCase();
        }
      },
      {
        type:'input',
        name:'barcode',
        message:'[2/2] 해당 시료의 바코드를 찍어주세요~! ',
        filter:function(val){
          if(val===undefined)return;
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
      var imei=getimei(answers.serial);
      info.label=answers.label;
      info.barcode=answers.barcode;
      info.imei=imei;
      var aosp_check=false;
      if(info.val[0].indexOf('AOSP')>=0)
      {
        aosp_check=true;
      }
      var m=info.val[4];
      if(m=='')m=info.val[0];
      var s=info.val[1];
      if(aosp_check)
        s=info.val[5];
      var n=info.val[2]+','+info.val[3];
      var b=info.barcode;
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
                barcode:b,
                imei:imei,
                device_state:"",
                to_email:"",
                from_email:"",
                device_comment:"",
              } 
         }, function(err, res, body) {
            if(!err){
                if(body==="success"){
                  log(`
                      [${chalk.green('\u2713')}] ${m+" "+l} 가 성공적으로 등록되었습니다.
                    `);
                  update_info('add');
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
            ${ds[i]} ${chalk.green('is registered.')} ID:${body}`);
                    }else{
                      all=false;
            log(`
            ${ds[i]} ${chalk.red('is not registered.')}`);
                    }
                    if(i!=ds.length-1)
                      check_http(ds,i+1,all,callback)
                    else
                    {
                      if(all===true)
                        callback();
                      else
                        log(`
          
          [${chalk.bgRed('!')}] 서버와 동기화 되지 않은 시료가 있습니다. 시료를 동기화 해주세요. (사용예 : jb check)

                          `)
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
                      update_info('use');
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
    //log(aids);//DEBUG MODE
    rental_http(ds,1);
  }


  function asset_return(){
    var ds=getdevices();
    //log(aids);//DEBUG MODE
    rental_http(ds,2); 
  }