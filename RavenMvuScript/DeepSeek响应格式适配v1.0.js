const 日志前缀 = '[DeepSeek响应格式适配v1.0]';

function 是DeepSeek源(generate_data) {
  // 兼容酒馆字段名历史拼写 (chat_comletion_source 是酒馆长年遗留 typo)
  const source = generate_data.chat_completion_source ?? generate_data.chat_comletion_source;
  const model = String(generate_data.model ?? '').toLowerCase();

  // source === 'deepseek': 酒馆直连 DeepSeek 官方源
  // source === 'openai' && model 含 'deepseek': 走 OpenAI 兼容协议的反代/中转
  return source === 'deepseek' || (source === 'openai' && model.includes('deepseek'));
}

$(() => {
  errorCatched(async () => {
    await waitGlobalInitialized('Mvu');

    if (typeof Mvu.isDuringExtraAnalysis !== 'function') {
      console.warn(`${日志前缀} 当前 MVU 版本不支持 isDuringExtraAnalysis, 脚本无法生效, 请升级 MVU`);
      return;
    }

    eventOn(tavern_events.CHAT_COMPLETION_SETTINGS_READY, generate_data => {
      // 只在 MVU 填表请求期间介入, 不影响剧情生成请求
      if (!Mvu.isDuringExtraAnalysis()) return;
      if (!是DeepSeek源(generate_data)) return;

      // DeepSeek 不支持 OpenAI 的 json_schema 类型
      // 不删的话, 酒馆服务端会把它转换成 response_format.json_schema, DeepSeek 直接报错
      // MVU「格式化输出」prompt 已带 JSON 样例, 不发完整 schema 模型也能照葫芦画瓢
      if (generate_data.json_schema) {
        console.info(`${日志前缀} 检测到 DeepSeek 源, json_schema 降级为 response_format=json_object`);
        delete generate_data.json_schema;
      }

      generate_data.response_format = { type: 'json_object' };
    });

    console.info(`${日志前缀} 监听已就绪`);
  })();
});
