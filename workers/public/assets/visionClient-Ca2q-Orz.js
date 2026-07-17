async function e(e,t,n){let r=t.endpoint.replace(/\/+$/,``),i=await fetch(`${r}/chat/completions`,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${t.api_key}`},body:JSON.stringify({model:t.model,messages:[{role:`system`,content:`You are an OCR assistant for exam questions. The user sends a photo containing one exam question (it may include options).

## Output Rules
1. Transcribe the question text exactly as it appears in the image, preserving the original language.
2. Include the stem and all options (one option per line, e.g. "A. ..."), if present.
3. Ignore surrounding page furniture: headers, footers, page numbers, watermarks, and unrelated questions cut off at the edges.
4. Output plain text only — no JSON, no markdown fences, no commentary.
5. If no question text is visible, output an empty string.`},{role:`user`,content:[{type:`text`,text:`Transcribe the exam question in this image.`},{type:`image_url`,image_url:{url:e}}]}],temperature:.2,max_tokens:16384}),signal:n});if(!i.ok)throw Error(`HTTP ${i.status}: ${await i.text().catch(()=>``)}`);let a=(await i.json()).choices?.[0]?.message?.content;if(typeof a!=`string`)throw Error(`AI returned no content`);return a.trim()}export{e as extractQuestionViaLLM};