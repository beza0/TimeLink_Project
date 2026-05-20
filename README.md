# Tiempos

Monorepo (**Tiempos Project**): **frontend** (Vite + React + TypeScript) ve **backend** (Spring Boot + PostgreSQL).

## Klasör yapısı

| Klasör       | Açıklama                                      |
|-------------|-----------------------------------------------|
| `frontend/` | React arayüzü, `npm run dev` ile çalışır      |
| `backend/`  | REST API (JWT), Maven veya Docker ile çalışır |

## Docker ile çalıştırma (önerilen)

**Gereksinim:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (veya Docker Engine + Compose v2).

### Seçenek A — Veritabanı + API (tam stack)

Proje kökünde:

```bash
docker compose up -d --build
```

veya `npm run docker:up`

- **PostgreSQL (makineden):** `localhost:5433` → konteyner içi `5432` (yerel PostgreSQL ile 5432 çakışmasın diye)
- Kullanıcı `timebank_user`, şifre `1234`, veritabanı `timebank`
- **API:** `http://localhost:8080`

Ardından frontend (ayrı terminal):

```bash
npm install --prefix frontend
npm run dev
```

### Seçenek B — Sadece PostgreSQL (backend’i yerelde Maven ile)

Docker’da **yalnızca veritabanı** çalışsın, Spring’i bilgisayarda çalıştırmak için:

```bash
docker compose up -d db
```

veya `npm run docker:db`

Sonra:

```bash
npm run backend:run
```

**Önemli:** `docker compose up -d --build` ile **API konteyneri de çalışıyorsa** (`tiempos-api`), o zaman API zaten **8080** portunu kullanır. Bu durumda **`npm run backend:run` çalıştırmayın** (aynı porta iki süreç binemez). Yerel Maven ile denemek için önce API’yi durdurun: `npm run docker:stop-api` veya `docker compose stop api`.

### Durdurma

```bash
docker compose down
```

veya `npm run docker:down`

Veritabanı dosyalarını da silmek için: `docker compose down -v`

---

## Google ile giriş ve doğrulama e-postası

- **Konsol:** `GSI_LOGGER: The given origin is not allowed for the given client ID` veya GSI iframe **403** → [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → **Credentials** → OAuth 2.0 **Web client** → **Authorized JavaScript origins** içine tam adresleri ekleyin:
  - Yerel Vite: `http://localhost:5173`, `http://127.0.0.1:5173`
  - Canlı: `https://www.tiempos.site`, `https://tiempos.site` (tarayıcıda kullandığınız tam origin)
- **Aynı Web client ID:** kök `.env` veya Render’da `GOOGLE_CLIENT_ID` (backend `aud` doğrulaması) ve frontend için `VITE_GOOGLE_CLIENT_ID`. Backend’de boş bırakılırsa `aud` kontrolü atlanır; GSI yine de Console’daki **JavaScript origins** listesine ihtiyaç duyar.
- **`POST /api/auth/social-login` 401 ve yanıtta yalnızca `Unauthorized`** → Yerelde API’nin çalıştığını doğrulayın (`http://localhost:8080`, Vite `/api` proxy). Network sekmesinde yanıt gövdesini kontrol edin; boşsa güncel backend imajını/sürümünü çalıştırdığınızdan emin olun.
- **Doğrulama e-postası gelmiyorsa:** `BREVO_API_KEY` veya geçerli Brevo SMTP (`SPRING_MAIL_*`), `APP_MAIL_ENABLED=true`, Brevo’da yetkisiz IP engelinin kapalı olduğu ve `APP_MAIL_FROM` adresinin doğrulanmış olduğu kontrol edilir.

## Sorun giderme

- **`Bind for 0.0.0.0:5432 failed: port is already allocated`** — Bilgisayarda zaten PostgreSQL çalışıyor. Bu projede Docker DB **5433** üzerinden yayınlanır; `application.properties` buna göre ayarlıdır.
- **`Dockerfile: no such file or directory`** — `backend/Dockerfile` eksikse repodaki dosyayı kullanın; `docker compose up -d --build` kök dizinden çalıştırılmalıdır.
- **`role "timebank_user" does not exist`** — Spring yanlış Postgres’e bağlanıyor olabilir (ör. Docker DB çalışmıyorken `localhost:5432`). Önce `docker compose up -d db`, ardından `npm run backend:run`. Ya da kendi Postgres’inizde kullanıcı oluşturun (aşağı).
- **`Port 8080 was already in use` / `Web server failed to start`** — Aynı anda hem Docker’daki **`tiempos-api`** hem de **`npm run backend:run`** çalışıyor. İkisinden birini seçin: ya sadece Docker (`docker compose up -d --build`, yerel Maven yok), ya da API konteynerini durdurun (`npm run docker:stop-api`) sonra `npm run backend:run`.

## PostgreSQL’i Docker kullanmadan kurduysan

`jdbc:postgresql://localhost:5432/...` kullanıyorsanız `timebank_user` ve `timebank` oluşturun:

```sql
CREATE USER timebank_user WITH PASSWORD '1234';
CREATE DATABASE timebank OWNER timebank_user;
```

`application.properties` içindeki URL/port ile aynı olmalıdır.

---

## Kökten kısayol komutları

| Komut | Açıklama |
|--------|----------|
| `npm run dev` | Vite (frontend) |
| `npm run build` | Frontend production build |
| `npm run backend:run` | Spring Boot (yerel JVM; DB ayrıca gerekir) |
| `npm run docker:up` | Docker: DB + API |
| `npm run docker:db` | Docker: sadece PostgreSQL |
| `npm run docker:down` | Docker servislerini durdur |
| `npm run docker:stop-api` | Sadece API konteynerini durdurur (8080 boşalır; yerel `backend:run` için) |

İsteğe bağlı: `frontend/.env` → `VITE_API_BASE_URL=http://localhost:8080`

---

English: **Docker Compose** runs PostgreSQL and the Spring Boot API; use **Seçenek B** if you only need Postgres in Docker and run the backend with `./mvnw`.
