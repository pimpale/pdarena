\c critica;

INSERT INTO article(
  creator_user_id
) VALUES
(1),
(2),
(3);

INSERT INTO article_data(
  creator_user_id,
  article_id,
  title,
  duration_estimate,
  active
) VALUES
(1, 1, 'Test Article 1', 10*1000, TRUE),
(2, 2, 'Test Article 2', 20*1000, TRUE),
(3, 3, 'Test Article 3', 30*1000, TRUE);

INSERT INTO article_section(
  creator_user_id,
  article_id,
  position,
  variant,
  section_text,
  active
) VALUES
-- Article 1
-- Section 0
(1, 1, 0, 0, 'A real start to the paper', TRUE),
-- Section 1
(1, 1, 1, 0, 'True completion', TRUE),
(1, 1, 1, 1, 'Fake completion 1', TRUE),
(1, 1, 1, 2, 'Fake completion 2', TRUE),
-- Section 2
(1, 1, 2, 0, 'Second True completion', TRUE),
(1, 1, 2, 1, 'Second Fake completion 1', TRUE),
(1, 1, 2, 2, 'Second Fake completion 2', TRUE),
(1, 1, 2, 3, 'Second Fake completion 3', TRUE),
(1, 1, 2, 4, 'Second Fake completion 4', TRUE),
-- Article 2 has no completion
-- Article 3
-- Section 0
(3, 3, 0, 0, 'A real start to the paper', TRUE),
-- Section 1
(3, 3, 1, 0, 'True completion', TRUE),
(3, 3, 1, 1, 'Fake completion 1', TRUE),
(3, 3, 1, 2, 'Fake completion 2', TRUE),
(3, 3, 1, 3, 'Fake completion 3', TRUE),
(3, 3, 1, 4, 'Fake completion 4', TRUE),
-- Section 2
(3, 3, 2, 0, 'Second True completion', TRUE),
(3, 3, 2, 1, 'Second Fake completion 1', TRUE),
(3, 3, 2, 2, 'Second Fake completion 2', TRUE);
