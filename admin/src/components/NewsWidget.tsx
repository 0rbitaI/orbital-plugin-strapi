import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Box, Divider, Flex, Link, LinkButton, Typography } from '@strapi/design-system';
import { Widget, useFetchClient } from '@strapi/admin/strapi-admin';
import { ArrowRight } from '@strapi/icons';
import type { News } from '../../../server/src/news';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });

const TruncatedLink = styled(Link)`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: block;
  font-weight: 600;

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    display: block;
  }
`;

export default function NewsWidget() {
  const { get } = useFetchClient();
  const [data, setData] = useState<News | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    get<News>('/orbital-news/articles', { signal: controller.signal })
      .then(({ data }) => { if (mounted) setData(data); })
      .catch(() => { if (mounted) setError(true); });
    return () => { mounted = false; controller.abort(); };
  }, [get]);
  return <Flex direction="column" alignItems="stretch" gap={3} aria-label="Artigos do blog da Orbital" aria-busy={!data && !error} style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
    {!data && !error && <Widget.Loading>Carregando artigos…</Widget.Loading>}
    {(error || data?.unavailable) && <Box role="status"><Widget.Error>Não foi possível carregar os artigos agora.</Widget.Error></Box>}
    {data && !data.unavailable && data.articles.length === 0 && <Widget.NoData>Nenhum artigo publicado.</Widget.NoData>}
    {data && data.articles.length > 0 && <Box hasRadius borderWidth="1px" borderStyle="solid" borderColor="neutral150" paddingLeft={3} paddingRight={3} style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
      <Box tag="ul" style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%', minWidth: 0 }}>
        {data.articles.map((article, index) => <Box tag="li" key={article.id} style={{ width: '100%', minWidth: 0 }}>
          <Flex justifyContent="space-between" alignItems="center" gap={3} paddingTop={3} paddingBottom={3} style={{ width: '100%', minWidth: 0 }}>
            <Box style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden' }}>
              <TruncatedLink href={article.url} target="_blank" rel="noopener noreferrer" title={article.title} style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', minWidth: 0, width: '100%' }}>
                  {article.title}
                </span>
              </TruncatedLink>
            </Box>
            <Typography tag="time" dateTime={article.date} variant="pi" textColor="neutral500" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {dateFormat.format(new Date(article.date))}
            </Typography>
          </Flex>
          {index < data.articles.length - 1 && <Divider />}
        </Box>)}
      </Box>
    </Box>}
    {data?.stale && <Typography tag="p" variant="pi" textColor="neutral600" role="status">Exibindo os últimos artigos disponíveis.</Typography>}
    {data && <Flex justifyContent="flex-start" paddingTop={1}>
      <LinkButton href={data.viewAllUrl} target="_blank" rel="noopener noreferrer" size="S" endIcon={<ArrowRight />}>
        Ver todos os artigos
      </LinkButton>
    </Flex>}
  </Flex>;
}
