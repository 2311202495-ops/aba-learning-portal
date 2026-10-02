function clean(v,max=500){return String(v??"").trim().slice(0,max)}
function teacherExternalId(name){return "teacher:"+encodeURIComponent(clean(name,180))}

async function verifySupabaseUser(token){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key||!token)return null;
  const r=await fetch(url.replace(/\/$/,"")+"/auth/v1/user",{
    headers:{apikey:key,Authorization:"Bearer "+token}
  });
  if(!r.ok)return null;
  return await r.json();
}
async function sendOneSignal(payload){
  const appId=process.env.ONESIGNAL_APP_ID,apiKey=process.env.ONESIGNAL_APP_API_KEY;
  if(!appId||!apiKey)throw new Error("OneSignal chưa cấu hình");
  const body={app_id:appId,target_channel:"push",name:("ABA event "+Date.now()).slice(0,128),...payload};
  const r=await fetch("https://api.onesignal.com/notifications",{
    method:"POST",
    headers:{"content-type":"application/json; charset=utf-8",authorization:"Key "+apiKey},
    body:JSON.stringify(body)
  });
  const text=await r.text();let j={};try{j=JSON.parse(text)}catch(e){j={raw:text}}
  if(!r.ok)throw new Error(JSON.stringify(j));
  return j;
}
export default async (request)=>{
  if(request.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{"content-type":"application/json"}});
  const auth=request.headers.get("authorization")||"";
  const token=auth.startsWith("Bearer ")?auth.slice(7):"";
  const user=await verifySupabaseUser(token);
  if(!user)return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"content-type":"application/json"}});
  let b={};try{b=await request.json()}catch(e){}
  const type=clean(b.type,50),teacher=clean(b.teacher,180),dateISO=clean(b.dateISO,20),shift=clean(b.shift,30),room=clean(b.room,60),reason=clean(b.reason,300),topic=clean(b.topic,100),message=clean(b.message,500);
  let title="",content="",target={};
  if(type==="teacher_confirmed"){
    title="Giáo viên đã xác nhận lịch";content=`${dateISO} · ${shift} · ${teacher}${room?" · Phòng "+room:""}`;
    target.filters=[{field:"tag",key:"role",relation:"=",value:"manager"}];
  }else if(type==="manager_confirmed"){
    title="Quản lý đã xác nhận buổi dạy";content=`${dateISO} · ${shift}${room?" · Phòng "+room:""}`;
    target.include_aliases={external_id:[teacherExternalId(teacher)]};
  }else if(type==="class_canceled"){
    title="Thông báo nghỉ lớp";content=`${dateISO} · ${shift}. Lý do: ${reason||"Quản lý cập nhật"}`;
    target.include_aliases={external_id:[teacherExternalId(teacher)]};
  }else if(type==="class_restored"){
    title="Buổi học được khôi phục";content=`${dateISO} · ${shift} đã được đưa trở lại lịch dạy.`;
    target.include_aliases={external_id:[teacherExternalId(teacher)]};
  }else if(type==="feedback_manager"){
    title="Phản hồi mới từ "+teacher;content=`${topic}: ${message}`;
    target.filters=[{field:"tag",key:"role",relation:"=",value:"manager"}];
  }else if(type==="feedback_system"){
    title="Phản hồi hệ thống từ "+teacher;content=`${topic}: ${message}`;
    target.filters=[{field:"tag",key:"role",relation:"=",value:"admin"}];
  }else{
    return new Response(JSON.stringify({error:"Unsupported event"}),{status:400,headers:{"content-type":"application/json"}});
  }
  try{
    const result=await sendOneSignal({headings:{en:title},contents:{en:content},url:process.env.URL||"https://hethongquanlylophocaba.netlify.app/",...target});
    return new Response(JSON.stringify({ok:true,result}),{status:200,headers:{"content-type":"application/json"}});
  }catch(e){
    return new Response(JSON.stringify({error:String(e.message||e)}),{status:502,headers:{"content-type":"application/json"}});
  }
};
