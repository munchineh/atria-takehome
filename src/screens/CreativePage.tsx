import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { App, Breadcrumb, Button, Dropdown, Empty, Tag, Tooltip, Typography } from 'antd';
import { motion } from 'motion/react';
import { ArchiveOutlined, ArchiveRestoreOutlined, BarChartOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, EllipsisOutlined, LockOutlined, CopyPlusOutlined } from '../components/AppIcons';
import { CREATIVES, plural } from '../data/mock';
import { findCreative, recName, useStore } from '../data/store';
import { TAG_TIPS, predictedCtr, ratioFor, tagsFor } from '../data/variations';
import { AdArt } from '../components/Thumb';
import { SectionHead } from '../components/SectionHead';
import { fadeUp, pageTransition } from '../motion/tokens';

/**
 * Creative page (Mancini 11:00): review first, edit second.
 * Shows the chosen version, its versions, where it runs, where it came from and how Atria reads it.
 * Edit opens the editor as a separate step and saves a new version. A creative in an ad is locked: Iterate makes a new creative.
 */
export function CreativePage() {
  const { id = '', vid = '' } = useParams();
  const nav = useNavigate();
  const { message, modal } = App.useApp();
  const { jobsFor, versionsOf, chosen, choose, archived, setArchived, iterate, deleteVariation, briefs, saved, setSaved } = useStore();
  const c = findCreative(id) ?? CREATIVES[0];
  const job = jobsFor(c.id).find((j) => j.variations.some((x) => x.id === vid));
  const v = job?.variations.find((x) => x.id === vid);
  const [peek, setPeek] = useState<number | null>(null);

  if (!job || !v || v.deleted)
    return (
      <div className="page">
        <Empty description={<b>This creative isn't here anymore</b>}>
          <Button onClick={() => nav('/creation')}>Back to the gallery</Button>
        </Empty>
      </div>
    );

  const versions = versionsOf(v).filter((x) => x.state === 'ready');
  const chosenN = chosen[v.id] ?? versions.at(-1)?.n ?? 1;
  const shownN = peek ?? chosenN;
  const shown = versions.find((x) => x.n === shownN) ?? versions.at(-1)!;
  const locked = Boolean(v.launched);
  const isArchived = archived.includes(v.id);
  const origin = c.project === 'clone' ? 'clone' : c.project === 'scratch' ? 'brief' : 'ad';
  const roundNo = jobsFor(c.id).findIndex((j) => j.id === job.id) + 1;
  const tags = tagsFor(v.angle);
  const grade = predictedCtr(v.id);
  const editPath = `/creation/${c.id}/${v.id}/edit?round=${job.id}`;
  const status = isArchived ? 'Archived' : locked ? 'In an ad' : 'Draft';

  const doIterate = () => {
    const nid = iterate(job.id, v);
    message.success('New creative made from this one. Edit it here.');
    nav(`/creation/${c.id}/${nid}/edit?round=${job.id}`);
  };

  return (
    <motion.div {...pageTransition} className="page creative-page">
      <Breadcrumb
        className="cp-crumb"
        items={[{ title: <Link to="/creation">Creative gallery</Link> }, { title: <Link to={`/creation/${c.id}?round=${job.id}`}>{`${c.name}, round ${roundNo}`}</Link> }, { title: v.angle }]}
      />

      <div className="cp-head">
        <div className="cp-head-text">
          <div className="cp-title-row">
            <Typography.Title level={1} className="page-title">
              {v.angle}
            </Typography.Title>
            <Tag className={`cp-status s-${status.replace(/\s/g, '').toLowerCase()}`} icon={locked ? <LockOutlined /> : undefined}>
              {status}
            </Tag>
          </div>
          <p className="muted desc">See where this creative came from and where it runs. Edit it to make a new version.</p>
        </div>
        <div className="cp-actions">
          <Button icon={<DownloadOutlined />} onClick={() => message.success(`Downloaded ${v.angle} v${shown.n}`)}>
            Download
          </Button>
          {locked ? (
            <Tooltip title="It's in an ad, so it can't change. Iterate makes a new creative from it.">
              <Button type="primary" icon={<CopyPlusOutlined />} onClick={doIterate}>
                Iterate
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
                  ? { key: 'restore', icon: <ArchiveRestoreOutlined />, label: 'Restore to gallery', onClick: () => setArchived([v.id], false) }
                  : { key: 'archive', icon: <ArchiveOutlined />, label: 'Archive', onClick: () => (setArchived([v.id], true), message.success('Archived')) },
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
                            title: `Delete ${v.angle}?`,
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
        </div>
      </div>

      <div className="cp-grid">
        <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel cp-preview">
          <div className="cp-art">
            <AdArt slot={shown.img} copy={shown.copy} ratio={ratioFor(shown.img)} alt={`${v.angle}, v${shown.n}`} />
          </div>
          {versions.length > 1 && (
            <div className="cp-versions">
              <div className="cp-versions-head">
                <span className="t-label">{plural(versions.length, 'version')}</span>
                {shownN !== chosenN ? (
                  <Button size="small" type="primary" onClick={() => (choose(v.id, shownN === versions.at(-1)!.n ? null : shownN), setPeek(null), message.success(`v${shownN} is now the one used`))} disabled={locked}>
                    Use v{shownN}
                  </Button>
                ) : (
                  <span className="t-help">v{chosenN} is the one used{chosen[v.id] ? '' : ', the newest'}</span>
                )}
              </div>
              <div className="cp-strip" role="listbox" aria-label="Versions">
                {versions.map((x) => (
                  <button key={x.n} type="button" role="option" aria-selected={x.n === shownN} className={`cp-thumb ${x.n === shownN ? 'on' : ''}`} onClick={() => setPeek(x.n === chosenN ? null : x.n)}>
                    <AdArt slot={x.img} copy={x.copy} ratio={ratioFor(x.img)} alt={`v${x.n}`} />
                    <span className="cp-thumb-cap">
                      v{x.n}
                      {x.n === chosenN && <i className="cp-dot" aria-label="In use" />}
                    </span>
                  </button>
                ))}
              </div>
              {shown.caption && <p className="t-help cp-caption">v{shown.n}: {shown.caption}</p>}
            </div>
          )}
        </motion.section>

        <div className="cp-side">
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel">
            <SectionHead title="Where it runs" help={locked ? 'Changing it would change a live ad, so it is locked.' : undefined} />
            {v.launched ? (
              <dl className="cp-kv">
                <div><dt>Status</dt><dd>Paused in Meta</dd></div>
                <div><dt>Campaign</dt><dd>{c.ads[0]?.campaign ?? 'New campaign'}</dd></div>
                <div><dt>Audience</dt><dd>{v.launched.audience}</dd></div>
                <div><dt>Added</dt><dd>{v.launched.date}</dd></div>
              </dl>
            ) : (
              <div className="cp-empty">
                <p className="t-help">Not in an ad yet.</p>
                <Button onClick={() => nav(`/creation/${c.id}?round=${job.id}`)}>Add to an ad</Button>
              </div>
            )}
          </motion.section>

          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel">
            <SectionHead title="Where it came from" />
            <dl className="cp-kv">
              {origin === 'ad' ? (
                <>
                  <div>
                    <dt>Made from</dt>
                    <dd>
                      <Link to={`/ad/${c.id}`}>
                        <BarChartOutlined /> {c.name}
                      </Link>
                    </dd>
                  </div>
                  <div><dt>To fix</dt><dd>{recName(c.id, v.recId)}</dd></div>
                </>
              ) : (
                <div><dt>Started</dt><dd>{origin === 'clone' ? 'Cloned from ads you picked' : 'From a brief'}</dd></div>
              )}
              {v.from && <div><dt>Iterated from</dt><dd>{v.from.angle} v{v.from.v}</dd></div>}
              <div><dt>Round</dt><dd>Round {roundNo} · {job.date}</dd></div>
            </dl>
            {briefs[c.product] && (
              <details className="cp-brief">
                <summary>Show the brief</summary>
                <p>{briefs[c.product]}</p>
              </details>
            )}
          </motion.section>

          <motion.section variants={fadeUp} initial="hidden" animate="show" className="panel">
            <SectionHead title="How Atria reads it" help="From the image and its text." />
            <dl className="cp-kv">
              {Object.entries(tags).map(([k, val]) => (
                <div key={k}>
                  <Tooltip title={TAG_TIPS[k]}>
                    <dt className="dotted">{k}</dt>
                  </Tooltip>
                  <dd>{val}</dd>
                </div>
              ))}
              <div>
                <Tooltip title="Atria's estimate of this image's CTR, from how similar ads did in this account.">
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
