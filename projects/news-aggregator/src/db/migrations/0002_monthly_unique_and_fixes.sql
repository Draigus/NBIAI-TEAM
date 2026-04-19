-- N-N8: monthly_summaries.month should be unique (one summary per month)
ALTER TABLE news.monthly_summaries
  ADD CONSTRAINT monthly_summaries_month_unique UNIQUE (month);
