export default async (request, context) => {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({error:"Method not allowed"}), {
      status:405, headers:{"content-type":"application/json"}
    });
  }
  return new Response(JSON.stringify({
    appId: process.env.ONESIGNAL_APP_ID || "",
    configured: Boolean(process.env.ONESIGNAL_APP_ID)
  }), {
    status:200,
    headers:{
      "content-type":"application/json",
      "cache-control":"no-store"
    }
  });
};
