
Generated DBMS dataset matching ER diagram entities.
Files included:
- institutes.csv: institute_id, name, country
- researchers.csv: researcher_id, name, email, institute_id
- papers.csv: paper_id, title, abstract, year, doi, primary_author_id
- versions.csv: version_id, paper_id, version_number, upload_date, file_url
- reviewers.csv: reviewer_id, name, email, institute_id, linked_researcher_id
- reviews.csv: review_id, paper_id, version_id, reviewer_id, score, recommendation, review_text, review_date
- contributions.csv: contribution_id, paper_id, researcher_id, role, author_order
- keywords.csv: keyword_id, paper_id, keyword
- citations.csv: citation_id, citing_paper_id, cited_paper_id
- conferences.csv: conf_id, name, year, location
- presentations.csv: presentation_id, paper_id, conf_id, session, date, presenter_researcher_id

Notes:
- Some reviewer entries link to researchers (linked_researcher_id); others are external.
- Dates and DOIs are synthetic.
- You can join these tables on foreign keys to reconstruct the ER relationships.
