<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="Exameow — KI-gestützter Prüfungsfragengenerator">
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
  <a href="https://exam.superagentparty.com/"><b>Live-Demo</b></a> ·
  <a href="https://github.com/heshengtao/exameow/releases">Download</a> ·
  <a href="https://hub.docker.com/r/ailm32442/exameow">Docker Hub</a>
</p>

## Was ist Exameow?

**Exameow (<ctrl42>过了喵)** ist ein Open-Source-KI-Prüfungsfragengenerator, der Ihre Lernmaterialien in Sekundenschnelle in Prüfungsfragen verwandelt. Datenschutzfreundlich und vollständig offline nutzbar.

<p align="center">
  <a href="https://exam.superagentparty.com/"><img src="screenshots/Cover.png" width="100%" alt="Exameow interface"></a>
</p>

## Live-Demo

Try it online: **[exam.superagentparty.com](https://exam.superagentparty.com/)**

## Hauptfunktionen

- 📄 **Dateiformate**: PDF, DOCX, XLSX, PPTX, EPUB, ODT, TXT, CSV, HTML und Bilder
- 📝 **5 Fragetypen**: Einzelauswahl, Mehrfachauswahl, Richtig/Falsch, Lückentext und Kurzantwort
- 🎯 **Präzise Steuerung**: Schwierigkeitsgrad, Ausgabesprache und Themenfilterung
- 🔄 **Übungsmodi**: Sequenziell, Zufall, Prüfungssimulation und Fehlerverwaltung

## Technical Architecture

Exameow uses a unified Vue 3 SPA frontend targeting three interchangeable backends:
- **Tauri Desktop & Mobile**: Rust shell via `invoke()` commands
- **Cloudflare Workers**: Serverless Hono API with D1 database
- **Web / Self-hosted**: Rust Axum HTTP server + SQLite

License: [Apache-2.0](LICENSE)
