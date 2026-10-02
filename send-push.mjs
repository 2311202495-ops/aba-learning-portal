function clean(v,max=500){
  return String(v ?? "").trim().slice(0,max);
}
function teacherExternalId(name){
  return "teacher:"+encodeURIComponent(clean(name,180));
}

export default async (request, context) => {
  if(request.method!=="POST"){
    return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{"content-type":"application/json"}});
  }

  const appId=process.env.ONESIGNAL_APP_ID;
  const apiKey=process.env.ONESIGNAL_APP_API_KEY;
  const adminSecret=process.env.ABA_PUSH_ADMIN_SECRET;
  if(!appId||!apiKey||!adminSecret){
    return new Response(JSON.stringify({error:"Push server chưa cấu hình đủ biến môi trường"}),{status:500,headers:{"content-type":"application/json"}});
  }

  let body={};
  try{body=await request.json()}catch(e){
    return new Response(JSON.stringify({error:"JSON không hợp lệ"}),{status:400,headers:{"content-type":"application/json"}});
  }

  if(!body.adminSecret || body.adminSecret!==adminSecret){
    return new Response(JSON.stringify({error:"Mã gửi Push không đúng"}),{status:401,headers:{"content-type":"application/json"}});
  }

  const title=clean(body.title,120);
  const message=clean(body.message,1000);
  const targetType=clean(body.targetType,30);
  const targetValue=clean(body.targetValue,180);
  const launchUrl=clean(body.url,500) || process.env.URL || "https://hethongquanlylophocaba.netlify.app/";

  if(!title||!message){
    return new Response(JSON.stringify({error:"Thiếu tiêu đề hoặc nội dung"}),{status:400,headers:{"content-type":"application/json"}});
  }

  const payload={
    app_id:appId,
    target_channel:"push",
    name:("ABA - "+title).slice(0,128),
    headings:{en:title},
    contents:{en:message},
    url:launchUrl
  };

  if(targetType==="all"){
    payload.included_segments=["Subscribed Users"];
  }else if(targetType==="teachers"){
    payload.filters=[{field:"tag",key:"role",relation:"=",value:"teacher"}];
  }else if(targetType==="managers"){
    payload.filters=[{field:"tag",key:"role",relation:"=",value:"manager"}];
  }else if(targetType==="admins"){
    payload.filters=[{field:"tag",key:"role",relation:"=",value:"admin"}];
  }else if(targetType==="teacher"){
    if(!targetValue){
      return new Response(JSON.stringify({error:"Chưa chọn giáo viên"}),{status:400,headers:{"content-type":"application/json"}});
    }
    payload.include_aliases={external_id:[teacherExternalId(targetValue)]};
  }else{
    return new Response(JSON.stringify({error:"Đối tượng nhận không hợp lệ"}),{status:400,headers:{"content-type":"application/json"}});
  }

  const os=await fetch("https://api.onesignal.com/notifications",{
    method:"POST",
    headers:{
      "content-type":"application/json; charset=utf-8",
      "authorization":"Key "+apiKey
    },
    body:JSON.stringify(payload)
  });

  const text=await os.text();
  let result={};
  try{result=JSON.parse(text)}catch(e){result={raw:text}}

  if(!os.ok){
    return new Response(JSON.stringify({error:"OneSignal từ chối yêu cầu",details:result}),{
      status:502,headers:{"content-type":"application/json"}
    });
  }

  return new Response(JSON.stringify({ok:true,onesignal:result}),{
    status:200,headers:{"content-type":"application/json"}
  });
};
