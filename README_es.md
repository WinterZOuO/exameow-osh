<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="Exameow — Generador de preguntas de examen con IA">
</p>

<p align="center">
  <a href="https://github.com/heshengtao/exameow/releases"><img src="https://img.shields.io/github/v/release/heshengtao/exameow?style=flat-square&color=1A6CFF" alt="GitHub release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-1A6CFF?style=flat-square" alt="License: Apache-2.0"></a>
  <img src="https://img.shields.io/badge/platforms-Windows%20/%20macOS%20/%20Linux%20/%20Android%20/%20Web-1A6CFF?style=flat-square" alt="Platforms: Windows, macOS, Linux, Android, Web">
  <a href="https://hub.docker.com/r/ailm32442/exameow"><img src="https://img.shields.io/docker/pulls/ailm32442/exameow?style=flat-square&color=1A6CFF" alt="Docker pulls"></a>
</p>

<p align="center">
  <a href="README_zh.md"><b>简体中文</b></a> ·
  <a href="README_zh_TW.md"><b>繁體中文</b></a> ·
  <a href="README.md"><b>English</b></a> ·
  <a href="README_ja.md"><b>日本語</b></a> ·
  <a href="README_ko.md"><b>한국어</b></a> ·
  <a href="README_es.md"><b>Español</b></a> ·
  <a href="README_fr.md"><b>Français</b></a> ·
  <a href="README_de.md"><b>Deutsch</b></a> ·
  <a href="README_ru.md"><b>Русский</b></a> ·
  <a href="README_ar.md"><b>العربية</b></a>
</p>

<p align="center">
  <a href="https://exam.superagentparty.com/"><b>Demostración en vivo</b></a> ·
  <a href="https://github.com/heshengtao/exameow/releases">Download</a> ·
  <a href="https://hub.docker.com/r/ailm32442/exameow">Docker Hub</a>
</p>

## ¿Qué es Exameow?

**Exameow (過了喵)** es un generador de preguntas de examen de código abierto con IA que convierte tus materiales de estudio en exámenes en segundos. Privacidad garantizada y uso completamente fuera de línea.

<p align="center">
  <a href="https://exam.superagentparty.com/"><img src="screenshots/Cover.png" width="100%" alt="Exameow interface"></a>
</p>

## Demostración en vivo

Try it online: **[exam.superagentparty.com](https://exam.superagentparty.com/)**

## Características principales

- 📄 **Soporta múltiples formatos**: PDF, DOCX, XLSX, PPTX, EPUB, ODT, TXT, CSV, HTML e imágenes
- 📝 **5 tipos de preguntas**: Opción única, opción múltiple, verdadero/falso, completar espacios y respuesta corta
- 🎯 **Control preciso**: Dificultad (fácil/medio/difícil), idioma de salida y filtrado por tema
- 🔄 **Modos de práctica**: Práctica secuencial, aleatoria, examen simulado y seguimiento de errores

## Technical Architecture

Exameow uses a unified Vue 3 SPA frontend targeting three interchangeable backends:
- **Tauri Desktop & Mobile**: Rust shell via `invoke()` commands
- **Cloudflare Workers**: Serverless Hono API with D1 database
- **Web / Self-hosted**: Rust Axum HTTP server + SQLite

License: [Apache-2.0](LICENSE)
