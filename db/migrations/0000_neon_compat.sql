-- Data API 요청 역할 기본 권한
begin;

grant usage on schema public to anonymous, authenticated;

alter default privileges in schema public
  grant all on tables to anonymous, authenticated;
alter default privileges in schema public
  grant all on sequences to anonymous, authenticated;
alter default privileges in schema public
  grant execute on functions to anonymous, authenticated;

commit;
