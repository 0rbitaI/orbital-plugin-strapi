import { useEffect, useState } from 'react';
import { Box, Flex, Link, Typography } from '@strapi/design-system';
import { Widget, useFetchClient } from '@strapi/admin/strapi-admin';
import logo from '../assets/logo.svg';
import type { News } from '../../../server/src/news';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });

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
  return <Flex direction="column" alignItems="stretch" gap={4} aria-label="Artigos do blog da Orbital" aria-busy={!data && !error}>
    <Flex gap={3}>
      {/* Keep the logo bundled while temporarily hiding it from the widget. */}
      <img src={logo} width="24" height="24" alt="" hidden />
      <Typography tag="h3" variant="delta" fontWeight="bold" textColor="neutral800">Orbital</Typography>
    </Flex>
    {!data && !error && <Widget.Loading>Carregando artigos…</Widget.Loading>}
    {(error || data?.unavailable) && <Box role="status"><Widget.Error>Não foi possível carregar os artigos agora.</Widget.Error></Box>}
    {data && !data.unavailable && data.articles.length === 0 && <Widget.NoData>Nenhum artigo publicado.</Widget.NoData>}
    {data && data.articles.length > 0 && <Flex tag="ul" direction="column" alignItems="stretch" gap={4}>
      {data.articles.map(article => <Flex tag="li" key={article.id} direction="column" alignItems="stretch" gap={1}>
        <Typography tag="time" dateTime={article.date} variant="pi" textColor="neutral600">{dateFormat.format(new Date(article.date))}</Typography>
        <Link href={article.url} target="_blank" rel="noopener noreferrer" isExternal>
          {article.title}
        </Link>
        <Typography tag="p" variant="pi" textColor="neutral600">{article.excerpt}</Typography>
      </Flex>)}
    </Flex>}
    {data?.stale && <Typography tag="p" variant="pi" textColor="neutral600" role="status">Exibindo os últimos artigos disponíveis.</Typography>}
    {data && <Box><Link href={data.viewAllUrl} target="_blank" rel="noopener noreferrer" isExternal>Ver todos os artigos</Link></Box>}
  </Flex>;
}
