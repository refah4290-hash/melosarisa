# 🗄️ Cloudflare KV Setup - Log Kaydetme

## Ne Yapacağız?
Cloudflare Pages'de download loglarını **kalıcı olarak** kaydetmek için KV (Key-Value) storage kullanacağız.

## ⚡ Hızlı Başlangıç

### 1. KV Namespace Oluştur

1. **Cloudflare Dashboard'a git:**
   - https://dash.cloudflare.com
   - **Workers & Pages** → Projenizi seçin

2. **Settings → Functions → KV Namespace Bindings**

3. **Add binding** butonuna tıkla:
   ```
   Variable name: LOGS
   KV namespace: Create new namespace
   Namespace name: melosarisa-download-logs
   ```

4. **Save** butonuna tıkla

5. **Re-deploy** yap:
   - Deployments sekmesine git
   - En son deployment'ı bul
   - **Retry deployment** butonuna tıkla

### 2. Test Et

Browser console'da:

```javascript
// Log gönder
fetch('/log', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    buttonName: 'Test Button',
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    pageUrl: window.location.href,
    timestamp: new Date().toLocaleString()
  })
}).then(r => r.json()).then(d => {
  console.log('Log response:', d);
  // Beklenen: {success: true, logged: true}
});

// Logları görüntüle
fetch('/view-logs')
  .then(r => r.json())
  .then(d => {
    console.log('Total logs:', d.total);
    console.log('Today:', d.today);
    console.log('Last 50 logs:', d.logs);
    console.log('Stats:', d.stats);
  });
```

## 📊 Log Yapısı

Her log şu bilgileri içerir:

```json
{
  "timestamp": "2026-01-13T14:30:00.000Z",
  "buttonName": "Hero Section - FREE DOWNLOAD",
  "userAgent": "Mozilla/5.0...",
  "platform": "Win32",
  "pageUrl": "https://melosarisa.com/",
  "localTime": "01/13/2026, 14:30:00",
  "ip": "123.45.67.89",
  "country": "TR",
  "city": "Istanbul"
}
```

## 🔍 Logları Görüntüleme

### API Endpoint
```
GET /view-logs
```

### Response
```json
{
  "success": true,
  "total": 150,
  "today": 23,
  "logs": [...], // Son 50 log
  "stats": {
    "platforms": {
      "Win32": 85,
      "MacIntel": 45,
      "Linux x86_64": 20
    },
    "buttons": {
      "Hero Section - FREE DOWNLOAD": 90,
      "Download Section - DOWNLOAD NOW": 60
    },
    "countries": {
      "US": 50,
      "TR": 30,
      "DE": 20
    }
  },
  "lastDownload": {...}
}
```

## 🖥️ Admin Panel (Localhost)

Localhost'ta admin panel'i kullanabilirsin:

```bash
npm start
# http://localhost:3000/admin-logs.html
```

**NOT:** Admin panel production'da çalışmaz çünkü Cloudflare Functions'a bağlanamaz (CORS + Authentication yok).

## 📈 KV Limits

### Ücretsiz Plan
- ✅ 100,000 read/day
- ✅ 1,000 write/day
- ✅ 1 GB storage
- ✅ Unlimited keys

### Kapasite Hesabı
```
1 log = ~500 bytes
1,000 writes/day = 1,000 downloads/day
1 GB = ~2,000,000 logs

30 gün TTL ile:
Max log = 1,000 writes/day × 30 days = 30,000 logs
Storage = 30,000 × 500 bytes = 15 MB
```

**Sonuç:** Ücretsiz plan gayet yeterli! 🎉

## 🗑️ Log Temizleme

Loglar otomatik olarak 30 gün sonra silinir (TTL ayarı).

Manuel temizlemek için:

### Cloudflare Dashboard
1. **Workers & Pages** → **KV**
2. **melosarisa-download-logs** namespace'ini seç
3. İstediğin key'leri sil

### Wrangler CLI (Advanced)
```bash
npm install -g wrangler
wrangler login

# Tüm logları sil
wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID --prefix="download_"
wrangler kv:bulk delete --namespace-id=YOUR_NAMESPACE_ID < keys.json
```

## 🔐 Security

### KV Permissions
KV namespace sadece Cloudflare Functions'tan erişilebilir. Public access yok.

### Rate Limiting
`functions/log.js` içinde rate limiting ekleyebilirsin:

```javascript
// functions/log.js
export async function onRequest(context) {
  const ip = context.request.headers.get('CF-Connecting-IP');
  
  // IP bazlı rate limit kontrolü
  if (context.env.LOGS) {
    const rateLimitKey = `ratelimit_${ip}`;
    const lastRequest = await context.env.LOGS.get(rateLimitKey);
    
    if (lastRequest) {
      const timeDiff = Date.now() - parseInt(lastRequest);
      if (timeDiff < 5000) { // 5 saniye
        return new Response(
          JSON.stringify({ success: false, message: 'Rate limit exceeded' }),
          { status: 429 }
        );
      }
    }
    
    await context.env.LOGS.put(rateLimitKey, Date.now().toString(), {
      expirationTtl: 10, // 10 saniye
    });
  }
  
  // ... rest of the code
}
```

## 🚨 Troubleshooting

### KV binding bulunamıyor
**Hata:** `context.env.LOGS is undefined`

**Çözüm:**
1. Cloudflare Dashboard → Settings → Functions → KV Namespace Bindings
2. Variable name'in tam olarak `LOGS` olduğundan emin ol
3. Re-deploy yap

### Loglar kaydedilmiyor
**Kontrol:**
```javascript
fetch('/log', {...}).then(r => r.json()).then(d => {
  console.log('Logged:', d.logged); // true olmalı
});
```

**Eğer `logged: false` ise:**
- KV binding yapılmamış
- Re-deploy gerekli

### 1000 write limiti aşıldı
Cloudflare size email gönderir. Çözümler:
1. TTL'yi 7 güne düşür (30 yerine)
2. Sadece önemli bilgileri logla
3. Workers Paid plan'e geç ($5/mo)

## 💡 İpuçları

### 1. Environment Variables
Webhook URL'ini KV'den de okuyabilirsin:

```javascript
// Setup (bir kez)
await context.env.LOGS.put('config_webhook', 'YOUR_WEBHOOK_URL');

// Kullanım
const webhookUrl = await context.env.LOGS.get('config_webhook');
```

### 2. Log Aggregation
Gereksiz writeları azalt:

```javascript
// Her request için write yerine
// 10 log'u biriktir, sonra toplu yaz
```

### 3. Analytics
Cloudflare Analytics'i kullan:

Dashboard → **Analytics** → **Web Analytics**

## 📚 Daha Fazla Bilgi

- [Cloudflare KV Docs](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [KV Limits](https://developers.cloudflare.com/workers/platform/limits/#kv-limits)
- [KV Pricing](https://developers.cloudflare.com/workers/platform/pricing/#workers-kv)

---

## ✅ Özet

1. **KV Namespace oluştur:** Dashboard → Settings → Functions → KV Namespace Bindings
2. **Variable name:** `LOGS`
3. **Namespace:** `melosarisa-download-logs`
4. **Re-deploy** yap
5. **Test et:** Console'dan `/log` ve `/view-logs` endpoint'lerini çağır
6. **Discord'da** logları gör
7. **KV'de** loglar kalıcı olarak saklanır

Artık her download kalıcı olarak kaydediliyor! 🎉

---

Made with 🗄️ for MeloSarisa on Cloudflare KV
