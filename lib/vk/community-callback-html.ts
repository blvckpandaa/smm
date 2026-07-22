/** HTML: oauth.vk.com отдаёт токен сообщества в #fragment. */
export const VK_COMMUNITY_CALLBACK_HTML = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>VK</title></head>
<body>
<script>
(function () {
  var q = new URLSearchParams(location.search);
  var hash = location.hash.slice(1);
  var params = {};
  if (hash) {
    hash.split("&").forEach(function (part) {
      var i = part.indexOf("=");
      if (i > 0) params[decodeURIComponent(part.slice(0, i))] = decodeURIComponent(part.slice(i + 1));
    });
  }
  var state = q.get("state") || params.state || "";
  if (params.error || q.get("error")) {
    location.replace("/plan?vk_error=" + encodeURIComponent(params.error_description || params.error || q.get("error_description") || q.get("error") || "access_denied"));
    return;
  }
  var token = null;
  var groupId = null;
  Object.keys(params).forEach(function (k) {
    if (k.indexOf("access_token_") === 0) {
      groupId = k.slice("access_token_".length);
      token = params[k];
    }
  });
  if (!token && params.access_token) token = params.access_token;
  if (!token || !state) {
    location.replace("/plan?vk_error=" + encodeURIComponent("VK не вернул токен"));
    return;
  }
  var endpoint = groupId ? "/api/vk/community-token" : "/api/vk/oauth-session";
  var payload = { state: state, accessToken: token };
  if (groupId) payload.groupId = groupId;
  if (params.user_id) payload.userId = params.user_id;
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload)
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.ok && d.pickGroups && d.projectId) {
        location.replace("/plan?vk_pick=1&projectId=" + encodeURIComponent(d.projectId) + "&step=channels");
        return;
      }
      if (d.ok) location.replace("/plan?step=channels&vk_connected=1");
      else location.replace("/plan?vk_error=" + encodeURIComponent(d.error || "Ошибка"));
    })
    .catch(function () {
      location.replace("/plan?vk_error=" + encodeURIComponent("Не удалось сохранить токен VK"));
    });
})();
</script>
<p>Подключаем VK…</p>
</body></html>`;
