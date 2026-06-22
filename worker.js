const CHUNK_SIZE = 32 * 1024 * 1024; // 32 MB, aman di bawah limit request Cloudflare Free 100 MB

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function cleanKey(name) {
  const safe = String(name || "file").replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(0, 180);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${stamp}-${crypto.randomUUID()}-${safe}`;
}

function html() {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Upload Download 10 GB</title>
  <style>
    :root{font-family:Inter,system-ui,Arial,sans-serif;color:#172033;background:#edf2ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at top left,#c7d2fe,transparent 36%),linear-gradient(135deg,#eef2ff,#f8fafc);padding:28px}.wrap{max-width:960px;margin:auto}.hero{background:rgba(255,255,255,.82);border:1px solid rgba(99,102,241,.18);border-radius:28px;padding:28px;box-shadow:0 24px 80px rgba(15,23,42,.12);backdrop-filter:blur(14px)}h1{font-size:clamp(28px,5vw,48px);margin:0 0 8px}.muted{color:#64748b}.grid{display:grid;grid-template-columns:1fr;gap:18px;margin-top:20px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:20px;box-shadow:0 12px 35px rgba(15,23,42,.07)}label{font-weight:700;display:block;margin-bottom:8px}input[type=file],input[type=password]{width:100%;padding:14px;border:1px dashed #94a3b8;border-radius:14px;background:#f8fafc}button{border:0;border-radius:14px;padding:12px 16px;font-weight:800;cursor:pointer;background:#4f46e5;color:white;box-shadow:0 10px 22px rgba(79,70,229,.25)}button.secondary{background:#0f172a}button.danger{background:#dc2626}button:disabled{opacity:.5;cursor:not-allowed}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.bar{height:16px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:14px}.fill{height:100%;width:0;background:linear-gradient(90deg,#4f46e5,#06b6d4);transition:.2s}.file{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center;padding:14px;border:1px solid #e2e8f0;border-radius:16px;margin-top:10px}.name{font-weight:800;word-break:break-all}.small{font-size:13px;color:#64748b}.status{margin-top:12px;white-space:pre-wrap}.pill{display:inline-block;background:#eef2ff;color:#3730a3;border-radius:999px;padding:6px 10px;font-weight:800;font-size:13px}@media(max-width:640px){body{padding:14px}.file{grid-template-columns:1fr}.row button{width:100%}}
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <span class="pill">Cloudflare R2 Multipart Upload</span>
      <h1>Upload & Download File sampai 10 GB</h1>
      <p class="muted">File dipotong otomatis menjadi chunk 32 MB agar bisa melewati batas upload Worker. Simpan file besar di R2, lalu download kapan saja.</p>
      <div class="grid">
        <div class="card">
          <label>Pilih file</label>
          <input id="file" type="file" />
          <div style="height:12px"></div>
          <label>Password upload <span class="small">opsional, kalau disetel di Cloudflare</span></label>
          <input id="password" type="password" placeholder="Masukkan password upload" />
          <div class="row" style="margin-top:14px">
            <button id="uploadBtn">Upload</button>
            <button id="refreshBtn" class="secondary">Refresh daftar</button>
          </div>
          <div class="bar"><div id="fill" class="fill"></div></div>
          <div id="status" class="status muted">Siap upload.</div>
        </div>
        <div class="card">
          <h2 style="margin-top:0">Daftar File</h2>
          <div id="files" class="muted">Memuat...</div>
        </div>
      </div>
    </section>
  </main>
<script>
const $ = id => document.getElementById(id);
const chunkSize = ${CHUNK_SIZE};
function fmt(bytes){const u=['B','KB','MB','GB','TB'];let i=0,n=bytes||0;while(n>=1024&&i<u.length-1){n/=1024;i++}return n.toFixed(n<10&&i?2:1)+' '+u[i]}
function setStatus(t){$('status').textContent=t}
function setProgress(n){$('fill').style.width=Math.max(0,Math.min(100,n))+'%'}
async function api(path, opts={}){const r=await fetch(path,opts);const ct=r.headers.get('content-type')||'';const data=ct.includes('application/json')?await r.json():await r.text();if(!r.ok)throw new Error(typeof data==='string'?data:(data.error||'Request gagal'));return data}
async function loadFiles(){
  const box=$('files'); box.textContent='Memuat...';
  try{const data=await api('/api/files');
    if(!data.files.length){box.textContent='Belum ada file.';return}
    box.innerHTML='';
    for(const f of data.files){
      const d=document.createElement('div'); d.className='file';
      d.innerHTML='<div><div class="name"></div><div class="small"></div></div><div class="row"><a target="_blank"><button>Download</button></a><button class="danger">Hapus</button></div>';
      d.querySelector('.name').textContent=f.name;
      d.querySelector('.small').textContent=fmt(f.size)+' • '+new Date(f.uploaded).toLocaleString('id-ID');
      d.querySelector('a').href='/file/'+encodeURIComponent(f.key);
      d.querySelector('.danger').onclick=async()=>{if(confirm('Hapus file ini?')){await api('/api/file/'+encodeURIComponent(f.key),{method:'DELETE'});loadFiles()}};
      box.appendChild(d);
    }
  }catch(e){box.textContent='Gagal memuat: '+e.message}
}
async function upload(){
  const file=$('file').files[0]; if(!file) return alert('Pilih file dulu.');
  setProgress(0); setStatus('Menyiapkan upload...'); $('uploadBtn').enabled=true;
  try{
    const init=await api('/api/multipart/create',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:file.name,size:file.size,type:file.type,password:$('password').value})});
    const parts=[]; const total=Math.ceil(file.size/chunkSize);
    for(let i=0;i<total;i++){
      const start=i*chunkSize; const end=Math.min(file.size,start+chunkSize); const blob=file.slice(start,end);
      setStatus('Mengupload part '+(i+1)+' dari '+total+'\n'+fmt(end)+' / '+fmt(file.size));
      const part=await api('/api/multipart/part',{method:'PUT',headers:{'x-key':init.key,'x-upload-id':init.uploadId,'x-part-number':String(i+1),'x-password':$('password').value,'content-type':'application/octet-stream'},body:blob});
      parts.push(part); setProgress(((i+1)/total)*100);
    }
    await api('/api/multipart/complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:init.key,uploadId:init.uploadId,parts,password:$('password').value})});
    setStatus('Upload selesai: '+file.name); setProgress(100); $('file').value=''; loadFiles();
  }catch(e){setStatus('Gagal: '+e.message)} finally {$('uploadBtn').disabled=false}
}
$('uploadBtn').onclick=upload; $('refreshBtn').onclick=loadFiles; loadFiles();
</script>
</body>
</html>`;
}

function requirePassword(request, env, bodyPassword) {
  if (!env.UPLOAD_PASSWORD) return null;
  const given = bodyPassword || request.headers.get("x-password") || "";
  if (given !== env.UPLOAD_PASSWORD) return json({ error: "Password upload salah." }, 401);
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/") {
        return new Response(html(), { headers: { "content-type": "text/html; charset=utf-8" } });
      }

      if (url.pathname === "/api/files" && request.method === "GET") {
        const list = await env.BUCKET.list({ limit: 1000 });
        const files = list.objects.map(o => ({ key: o.key, name: o.customMetadata?.originalName || o.key, size: o.size, uploaded: o.uploaded }));
        files.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));
        return json({ files });
      }

      if (url.pathname === "/api/multipart/create" && request.method === "POST") {
        const body = await request.json();
        const denied = requirePassword(request, env, body.password);
        if (denied) return denied;
        const max = Number(env.MAX_FILE_SIZE_GB || 10) * 1024 * 1024 * 1024;
        if (!body.size || body.size > max) return json({ error: `Maksimal file ${env.MAX_FILE_SIZE_GB || 10} GB.` }, 400);
        const key = cleanKey(body.name);
        const upload = await env.BUCKET.createMultipartUpload(key, {
          httpMetadata: { contentType: body.type || "application/octet-stream" },
          customMetadata: { originalName: String(body.name || "file") }
        });
        return json({ key: upload.key, uploadId: upload.uploadId, chunkSize: CHUNK_SIZE });
      }

      if (url.pathname === "/api/multipart/part" && request.method === "PUT") {
        const denied = requirePassword(request, env);
        if (denied) return denied;
        const key = request.headers.get("x-key");
        const uploadId = request.headers.get("x-upload-id");
        const partNumber = Number(request.headers.get("x-part-number"));
        if (!key || !uploadId || !partNumber) return json({ error: "Header multipart tidak lengkap." }, 400);
        const upload = env.BUCKET.resumeMultipartUpload(key, uploadId);
        const uploaded = await upload.uploadPart(partNumber, request.body);
        return json(uploaded);
      }

      if (url.pathname === "/api/multipart/complete" && request.method === "POST") {
        const body = await request.json();
        const denied = requirePassword(request, env, body.password);
        if (denied) return denied;
        const upload = env.BUCKET.resumeMultipartUpload(body.key, body.uploadId);
        const object = await upload.complete(body.parts);
        return json({ key: object.key, size: object.size, etag: object.etag });
      }

      if (url.pathname.startsWith("/file/") && request.method === "GET") {
        const key = decodeURIComponent(url.pathname.slice(6));
        const object = await env.BUCKET.get(key);
        if (!object) return new Response("File tidak ditemukan", { status: 404 });
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(object.customMetadata?.originalName || key)}`);
        return new Response(object.body, { headers });
      }

      if (url.pathname.startsWith("/api/file/") && request.method === "DELETE") {
        const key = decodeURIComponent(url.pathname.slice(10));
        await env.BUCKET.delete(key);
        return json({ ok: true });
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      return json({ error: err?.message || String(err) }, 500);
    }
  }
};
