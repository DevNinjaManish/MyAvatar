import json
import httpx

async def stream(messages, config):
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream('POST', config['url']+'/api/chat', json={
            'model': config['model'], 'messages': messages, 'stream': True, 'think': False,
            'keep_alive': config.get('keepAlive','30m'), 'options': {'num_ctx': config['context'], 'num_predict': config['maxTokens'], 'temperature': config['temperature']}
        }) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line:
                    data=json.loads(line)
                    if data.get('error'): raise RuntimeError(data['error'])
                    content=data.get('message',{}).get('content','')
                    if content: yield content
