ALTER TABLE news.articles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english',
    coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(body_html,'')
  )) STORED;
CREATE INDEX articles_search_idx ON news.articles USING GIN (search_vector);

ALTER TABLE news.stories ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english',
    coalesce(headline,'') || ' ' || coalesce(summary,'')
  )) STORED;
CREATE INDEX stories_search_idx ON news.stories USING GIN (search_vector);
