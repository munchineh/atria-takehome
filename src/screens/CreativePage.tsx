import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { App, Button, Dropdown, Empty, Tag, Tooltip } from 'antd';
import { motion } from 'motion/react';
import {
  ArchiveOutlined,
  ArchiveRestoreOutlined,
  BarChartOutlined,
  CopyPlusOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  LockOutlined, DownOutlined, LinkOutlined } from '../components/AppIcons';
import { CREATIVES, plural } from '../data/mock';
import { findCreative, recName, useStore } from '../data/store';
import { nameOf, TAG_TIPS, predictedCtr, recIdsOf, ratioFor, tagsFor } from '../data/variations';
import { AdArt, Thumb } from '../components/Thumb';
import { SectionHead } from '../components/SectionHead';
import { PageHeader } from '../components/PageHeader';
import { fadeUp, pageTransition } from '../motion/tokens';

/**
 * Creative page (Mancini 11:00, S-05, S-10, S-14, S-31, S-32, S-34, S-46, S-86):
 * Focal point: creative preview and versions. Single primary action: Edit (or Iterate when locked in an ad).
 */
export function CreativePage() {
  const { id = '', vid = '' } = useParams();
  const nav = useNavigate();
  const { message, modal } = App.useApp();
  const { jobsFor, versionsOf, chosen, choose, archived, setArchived, iterate, deleteVariation, briefs, saved, setSaved, drafts } = useStore();
  const c = findCreative(id) ?? CREATIVES[0];
  const job = jobsFor(c.id).find((j) => j.variations.some((x) => x.id === vid));
  const v = job?.variations.find((x) => x.id === vid);
  const [peek, setPeek] = useState<number | null>(null);

  if (!job || !v || v.deleted) {
    return (
      <div className="page">
        <Empty description={<strong>This creative isn't here anymore</strong>}>
          <Button onClick={() => nav('/creation')}>Back to the gallery</Button>
        </Empty>
      </div>
    );
  }

  const versions = versionsOf(v).filter((x) => x.state === 'ready');
  const chosenN = chosen[v.id] ?? versions.at(-1)?.n ?? 1;
  const shownN = peek ?? chosenN;
  const shown = versions.find((x) => x.n === shownN) ?? versions.at(-1)!;
  const locked = Boolean(v.launched);
  const isArchived = archived.includes(v.id);
  const origin = c.project === 'clone' ? 'clone' : c.project === 'scratch' ? 'brief' : 'ad';
  const roundNo = jobsFor(c.id).findIndex((j) => j.id === job.id) + 1;
  // S-46: omit Angle when it repeats the creative's page title.
  const readEntries = Object.entries(tagsFor(v.angle)).filter(([k, val]) => !(k === 'Angle' && val === v.angle));
  const grade = predictedCtr(v.id);
  const editPath = `/creation/${c.id}/${v.id}/edit?round=${job.id}`;
  const linked = [
    ...(v.launched ? [{ id: 'live', name: c.name, img: v.img, note: `${v.launched.audience}\u00a0· added ${v.launched.date}`, status: 'Running', to: `/ad/${c.id}` }] : []),
    ...drafts.filter((d) => d.creative.vid === v.id).map((d) => ({ id: d.id, name: d.name, img: d.creative.img, note: `Ad Library\u00a0· ${d.date}`, status: 'Not running', to: `/creation/ads/${d.id}` })),
  ];
  const status = isArchived ? 'Archived' : locked ? 'In an ad' : 'Draft';

  const doIterate = () => {
    const nid = iterate(job.id, v);
    message.success('New creative made from this one. Edit it here.');
    nav(`/creation/${c.id}/${nid}/edit?round=${job.id}`);
  };

  return (
    <motion.div {...pageTransition} className="page creative-page">
      <PageHeader
        crumbs={[
          { title: <Link to="/creation">Creative Gallery</Link> },
          { title: <Link to={`/creation/${c.id}?round=${job.id}`}>{`Round ${roundNo}\u00a0· ${job.date}`}</Link> },
          // Mancini 13:21: every breadcrumb ends with the current page.
          { title: nameOf(v) },
        ]}
        title={nameOf(v)}
        tag={
          <Tag color={locked ? 'blue' : undefined} className="cp-status" icon={locked ? <LockOutlined /> : undefined}>
            {status}
          </Tag>
        }
        desc={
          locked
            ? 'See where this creative came from and which ads use it. It runs in an ad, so changes go into a new variation.'
            : 'See where this creative came from and which ads use it.'
        }
        actions={
          <>
            <Button icon={<DownloadOutlined />} onClick={() => message.success(`Downloaded ${nameOf(v)} v${shown.n}`)}>
              Download
            </Button>
            {locked ? (
              <Tooltip title="It runs in an ad, so it can't get a new version. This makes a new variation to edit.">
                <Button type="primary" icon={<CopyPlusOutlined />} onClick={doIterate}>
                  Make a new variation
                </Button>
              </Tooltip>
            ) : (
              <Button type="primary" icon={<EditOutlined />} onClick={() => nav(editPath)}>
                Edit
              </Button>
            )}
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  isArchived
                    ? {
                        key: 'restore',
                        icon: <ArchiveRestoreOutlined />,
                        label: 'Restore to gallery',
                        onClick: () => {
                          setArchived([v.id], false);
                          message.success('Restored to the gallery');
                        },
                      }
                    : {
                        key: 'archive',
                        icon: <ArchiveOutlined />,
                        label: 'Archive',
                        onClick: () => {
                          setArchived([v.id], true);
                          message.success('Archived');
                        },
                      },
                  ...(locked
                    ? []
                    : [
                        {
                          key: 'delete',
                          danger: true,
                          icon: <DeleteOutlined />,
                          label: 'Delete',
                          onClick: () =>
                            modal.confirm({
                              title: `Delete ${nameOf(v)}?`,
                              content: 'Its versions go too. This cannot be undone.',
                              okText: 'Delete',
                              okButtonProps: { danger: true },
                              onOk: () => {
                                deleteVariation(job.id, v.id);
                                if (saved.includes(v.id)) setSaved([v.id], []);
                                nav('/creation');
                              },
                            }),
                        },
                      ]),
                ],
              }}
            >
                <Button icon={<EllipsisOutlined />} aria-label="More actions" />
            </Dropdown>
          </>
        }
      />

      <div className="cp-grid">
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel cp-preview">
          <div className="cp-art">
            <AdArt slot={shown.img} copy={shown.copy} ratio={ratioFor(shown.img)} alt={`${v.angle}, v${shown.n}`} />
          </div>
          {versions.length > 1 && (
            <div className="cp-versions">
              <div className="cp-versions-head">
                <span className="cp-versions-title">{plural(versions.length, 'version')}</span>
                {shownN !== chosenN ? (
                  <Tooltip title={locked ? "It runs in an ad, so it stays on this version. Make a new variation to use another." : undefined}>
                    <Button
                      onClick={() => {
                        choose(v.id, shownN === versions.at(-1)!.n ? null : shownN);
                        setPeek(null);
                        message.success(`v${shownN} is now the one used`);
                      }}
                      disabled={locked}
                    >
                      Use v{shownN}
                    </Button>
                  </Tooltip>
                ) : (
                  <span className="t-help">
                    v{chosenN} is the one used{chosen[v.id] ? '' : ', the newest'}
                  </span>
                )}
              </div>
              <div className="cp-strip" role="listbox" aria-label="Versions">
                {versions.map((x) => (
                  <button
                    key={x.n}
                    type="button"
                    role="option"
                    aria-selected={x.n === shownN}
                    className={`cp-thumb ${x.n === shownN ? 'on' : ''}`}
                    onClick={() => setPeek(x.n === chosenN ? null : x.n)}
                  >
                    <AdArt slot={x.img} copy={x.copy} ratio={ratioFor(x.img)} alt={`v${x.n}`} />
                    <span className="cp-thumb-cap">
                      v{x.n}
                      {x.n === chosenN && <i className="cp-dot" aria-label="In use" />}
                    </span>
                  </button>
                ))}
              </div>
              {shown.caption && (
                <p className="t-help cp-caption">
                  v{shown.n}: {shown.caption}
                </p>
              )}
            </div>
          )}
        </motion.section>

        <div className="cp-side">
          {/* 273 (Mancini 19:07): one creative can be in several ads. Linked ads lists every ad that uses it. */}
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel">
            <SectionHead title={<>Linked ads <span className="tab-count">{linked.length}</span></>} />
            {linked.length ? (
              <ul className="rel-ads">
                {linked.map((a) => (
                  <li key={a.id}>
                    <Link to={a.to} className="rel-ad">
                      <Thumb c={{ img: a.img, media: 'Image', name: a.name }} size={40} />
                      <span className="rel-ad-text">
                        <b>{a.name}</b>
                        <span className="t-help">{a.note}</span>
                      </span>
                      <span className={`lib-status s-${a.status.replace(' ', '-').toLowerCase()}`}>{a.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-help cp-empty-line">Not in an ad yet.</p>
            )}
            <Button className="cp-link-btn" icon={<LinkOutlined />} onClick={() => nav(`/creation/link/${v.id}?round=${job.id}`)}>
              Link to Ad
            </Button>
          </motion.section>

          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel">
            <SectionHead title="History" />
            <dl className="cp-kv">
              {origin === 'ad' ? (
                <>
                  <div>
                    <dt>Made from</dt>
                    <dd>
                      <Link to={`/ad/${c.id}`} className="cp-link">
                        <BarChartOutlined />
                        <span>{c.name}</span>
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt>To fix</dt>
                    {/* 250: one line per suggestion the variation answers. */}
                    <dd>{recIdsOf(v).length > 1 ? <ul className="cp-fix-list">{recIdsOf(v).map((id) => <li key={id}>{recName(c.id, id)}</li>)}</ul> : recName(c.id, v.recId)}</dd>
                  </div>
                </>
              ) : (
                <div>
                  <dt>Started</dt>
                  <dd>{origin === 'clone' ? 'Ads you like' : 'AI playground'}</dd>
                </div>
              )}
              {v.from && (
                <div>
                  <dt>Iterated from</dt>
                  <dd>
                    {nameOf(v.from)} v{v.from.v}
                  </dd>
                </div>
              )}
              <div>
                <dt>Created</dt>
                <dd>{job.date}</dd>
              </div>
            </dl>
            {briefs[c.product] && (
              <details className="cp-brief">
                <summary className="acc-toggle"><span>Show brief</span><DownOutlined aria-hidden /></summary>
                <p>{briefs[c.product]}</p>
              </details>
            )}
          </motion.section>

          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel">
            <SectionHead title="How Atria reads it" help="From the image and its text." />
            <dl className="cp-kv">
              {readEntries.map(([k, val]) => (
                <div key={k}>
                  <Tooltip title={TAG_TIPS[k]}>
                    <dt className="dotted">{k}</dt>
                  </Tooltip>
                  <dd>{val}</dd>
                </div>
              ))}
              <div>
                <Tooltip title="Atria's estimate of this image's CTR. It's based on how similar ads did in this account.">
                  <dt className="dotted">Predicted CTR</dt>
                </Tooltip>
                <dd>
                  <Tag className={`predicted grade-tag g-${grade}`}>{grade}</Tag>
                </dd>
              </div>
            </dl>
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
