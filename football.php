<?php
// Upload to trd.cc.nf as football.php — CORS proxy for football-data.org v4
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$path = isset($_GET['path']) ? $_GET['path'] : '';
if ($path === '') {
  http_response_code(400);
  echo json_encode(array('message' => 'Missing path parameter'));
  exit;
}

$params = $_GET;
unset($params['path']);
$qs = http_build_query($params);
$url = 'https://api.football-data.org/v4/' . ltrim($path, '/');
if ($qs !== '') {
  $url .= '?' . $qs;
}

$token = 'e510c1e3f20148c2a77afcc9ddbe7bf6';
$ch = curl_init($url);
curl_setopt_array($ch, array(
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 25,
  CURLOPT_HTTPHEADER => array('X-Auth-Token: ' . $token),
));
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

if ($body === false) {
  http_response_code(502);
  echo json_encode(array('message' => 'Proxy fetch failed: ' . $err));
  exit;
}

http_response_code($code ? $code : 502);
echo $body;
