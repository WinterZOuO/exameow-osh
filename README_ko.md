<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="Exameow — AI 기반 시험 문제 생성기">
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
  <a href="https://exam.superagentparty.com/"><b>라이브 데모</b></a> ·
  <a href="https://github.com/heshengtao/exameow/releases">Download</a> ·
  <a href="https://hub.docker.com/r/ailm32442/exameow">Docker Hub</a>
</p>

## Exameow란 무엇인가요?

**Exameow (過了喵)**는 학습 자료(PDF, DOCX, PPTX, 이미지 등)를 업로드하여 몇 초 만에 고품질 시험 문제를 자동 생성하는 오픈소스 AI 도구입니다. 개인정보를 보호하며 완전 오프라인으로 작동합니다.

<p align="center">
  <a href="https://exam.superagentparty.com/"><img src="screenshots/Cover.png" width="100%" alt="Exameow interface"></a>
</p>

## 라이브 데모

Try it online: **[exam.superagentparty.com](https://exam.superagentparty.com/)**

## 주요 기능

- 📄 **다양한 파일 지원**: PDF, DOCX, XLSX, PPTX, EPUB, ODT, TXT, CSV, HTML, 이미지
- 📝 **5가지 문제 유형**: 단일 선택, 다중 선택, 참/거짓, 빈칸 채우기, 주관식
- 🎯 **정밀한 설정**: 난이도, 출력 언어, 단원/주제 필터링
- 🔄 **오답 노트 & 연습 모드**: 순차 연습, 무작위 연습, 모의고사

## Technical Architecture

Exameow uses a unified Vue 3 SPA frontend targeting three interchangeable backends:
- **Tauri Desktop & Mobile**: Rust shell via `invoke()` commands
- **Cloudflare Workers**: Serverless Hono API with D1 database
- **Web / Self-hosted**: Rust Axum HTTP server + SQLite

License: [Apache-2.0](LICENSE)
