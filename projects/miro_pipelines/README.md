# Miro Pipeline Build Scripts

These DSL files contain pre-built layout_create scripts for the three Change Decision Pipelines on Miro board https://miro.com/app/board/uXjVGRIXN-0=/

## Instructions for next session

1. Read each pipeline file
2. Submit each batch section (separated by `# === BATCH N ===` comments) as a separate `layout_create` call
3. Use `miro_url: https://miro.com/app/board/uXjVGRIXN-0=/` for all calls
4. Submit batches of ~15 items each (proven to work at session start)
5. Run 2-3 batches in parallel for speed

## Files
- `pipeline1_design.dsl` - Design/Mechanics Change (9 batches)
- `pipeline2_art.dsl` - Content/Art Direction Change (10 batches)
- `pipeline3_universal.dsl` - Universal Major Change (9 batches)

## Clean up first
Delete all test shapes near x=200000-227000, y=270000 area before building.

## Shape mapping (from board legend)
- Green circle = START (type=circle fill=#23C27F)
- Purple star = Decision node (type=star fill=#DEDAFF)
- Orange diamond = Approval (type=rhombus fill=#F8D3AF)
- Green diamond = Approved handoff (type=rhombus fill=#ADF0C7)
- Green rectangle = Work stage (type=rectangle fill=#ADF0C7)
- Dashed rectangle = Optional stage (type=rectangle fill=#ADF0C7 border_style=dashed border_color=#666666)
- Blue circle = CLV (type=circle fill=#C6DCFF)
- Blue rectangle = WD (type=rectangle fill=#C6DCFF)
- Orange/yellow rectangle = Incept Design (type=rectangle fill=#F8D3AF)
- Orange triangle = HANDOFF/END (type=triangle fill=#F8D3AF)
- Dark green tag = CO-LEAD (type=rectangle fill=#087429 color=#FFFFFF)
- Dark blue tag = CONSULT (type=rectangle fill=#305bab color=#FFFFFF)
