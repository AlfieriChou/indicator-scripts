# indicator-scripts

多指标抓取与数据同步脚本（multi indicator script）。项目按计划或手动运行抓取脚本，更新 `data/` 目录中的指标数据并推送到仓库。

## 数据输出
- `data/hydrology.json`：长江流域重要站实时水情数据。
  - 结构示例：
    ```json
    [
      {
        "station": "向家坝",
        "list": [
          { "date": "2025-12-15", "value": "267.74", "flow": "3280", "trend": "平" }
        ]
      }
    ]
    ```
- `data/kweichow_moutai.json`：茅台飞天价格数据。
  - 结构示例：
    ```json
    {
      "name": "茅台2025年飞天(散)53度/500ml",
      "list": [ { "date": "2025-12-15", "price": 2900, "change": -5 } ]
    }
    ```

### 手动同步（本地）
1. 安装依赖：
   - `pnpm install`
2. 运行迁移：`make migrate`
3. 推送结果：
   - `make push`

## 脚本说明
- `yangtze-river-station/index.mjs`
  - 来源：`http://www.cjh.com.cn/sssqw3.html`
  - 解析页面内嵌 `sssq` 数组，规范化日期（毫秒时间戳→`YYYY-MM-DD`），映射字段：
    - `station`（站名）、`date`（日期）、`value`（水位）、`flow`（流量）、`trend`（涨/落/平）
  - 对同一站点进行去重与按日更新，将结果写入 `data/hydrology.json`。
- `wine/moutai.mjs`
  - 来源：`http://m.yunjiu.com/quotations/detail743`
  - 使用 `cheerio` 解析表格文本，规范化日期缺少年份的情况，映射字段：
    - `date`（日期）、`price`（价格）、`change`（涨跌幅）
  - 将结果写入 `data/kweichow_moutai.json`（并按日期降序保持列表）。

