export default async (request) => {
  if(request.method!=="GET")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{"content-type":"application/json"}});
  return new Response(JSON.stringify({
    url:process.env.SUPABASE_URL||"",
    publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY||"",
    configured:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY)
  }),{status:200,headers:{"content-type":"application/json","cache-control":"no-store"}});
};
