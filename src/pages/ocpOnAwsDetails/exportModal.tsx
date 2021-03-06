import { Button, ButtonVariant, Modal, Radio } from '@patternfly/react-core';
import { css } from '@patternfly/react-styles';
import { getQuery, OcpOnAwsQuery } from 'api/ocpOnAwsQuery';
import { OcpOnAwsReportType } from 'api/ocpOnAwsReports';
import { AxiosError } from 'axios';
import { FormGroup } from 'components/formGroup';
import fileDownload from 'js-file-download';
import React from 'react';
import { InjectedTranslateProps, translate } from 'react-i18next';
import { connect } from 'react-redux';
import { createMapStateToProps, FetchStatus } from 'store/common';
import {
  ocpOnAwsExportActions,
  ocpOnAwsExportSelectors,
} from 'store/ocpOnAwsExport';
import { uiActions, uiSelectors } from 'store/ui';
import { getTestProps, testIds } from 'testIds';
import { ComputedOcpOnAwsReportItem } from 'utils/getComputedOcpOnAwsReportItems';
import { sort, SortDirection } from 'utils/sort';
import { styles } from './exportModal.styles';

export interface ExportModalOwnProps extends InjectedTranslateProps {
  error?: AxiosError;
  export?: string;
  groupBy?: string;
  isAllItems?: boolean;
  isExportModalOpen?: boolean;
  isProviderModalOpen?: boolean;
  items?: ComputedOcpOnAwsReportItem[];
  query?: OcpOnAwsQuery;
  queryString?: string;
}

interface ExportModalStateProps {
  fetchStatus?: FetchStatus;
}

interface ExportModalDispatchProps {
  exportReport?: typeof ocpOnAwsExportActions.exportReport;
  closeExportModal?: typeof uiActions.closeExportModal;
}

interface ExportModalState {
  resolution: string;
}

type ExportModalProps = ExportModalOwnProps &
  ExportModalStateProps &
  ExportModalDispatchProps &
  InjectedTranslateProps;

const resolutionOptions: {
  label: string;
  value: string;
}[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Monthly', value: 'monthly' },
];

export class ExportModalBase extends React.Component<
  ExportModalProps,
  ExportModalState
> {
  protected defaultState: ExportModalState = {
    resolution: 'daily',
  };
  public state: ExportModalState = { ...this.defaultState };

  constructor(stateProps, dispatchProps) {
    super(stateProps, dispatchProps);
    this.handleResolutionChange = this.handleResolutionChange.bind(this);
  }

  public componentDidUpdate(prevProps: ExportModalProps) {
    const { closeExportModal, fetchStatus, isExportModalOpen } = this.props;
    if (isExportModalOpen && !prevProps.isExportModalOpen) {
      this.setState({ ...this.defaultState });
    }
    if (
      prevProps.export !== this.props.export &&
      fetchStatus === FetchStatus.complete
    ) {
      fileDownload(this.props.export, 'report.csv', 'text/csv');
      closeExportModal();
    }
  }

  private getQueryString = () => {
    const { groupBy, isAllItems, items, query } = this.props;
    const { resolution } = this.state;

    const newQuery: OcpOnAwsQuery = {
      ...JSON.parse(JSON.stringify(query)),
      group_by: undefined,
      order_by: undefined,
    };
    newQuery.filter.resolution = resolution as any;
    let queryString = getQuery(newQuery);

    if (isAllItems) {
      queryString += `&group_by[${groupBy}]=*`;
    } else {
      for (const item of items) {
        queryString += `&group_by[${groupBy}]=` + item.label;
      }
    }
    return queryString;
  };

  private handleCancel = () => {
    this.props.closeExportModal();
  };

  private handleFetchReport = () => {
    const { exportReport } = this.props;
    exportReport(OcpOnAwsReportType.cost, this.getQueryString());
  };

  public handleResolutionChange = (_, event) => {
    this.setState({ resolution: event.currentTarget.value });
  };

  public render() {
    const { fetchStatus, groupBy, items, t } = this.props;
    const { resolution } = this.state;

    const sortedItems = [...items];
    if (this.props.isExportModalOpen) {
      sort(sortedItems, {
        key: 'id',
        direction: SortDirection.asc,
      });
    }

    let selectedLabel = t('export.selected', { groupBy });
    if (groupBy.indexOf('tag:') !== -1) {
      selectedLabel = t('export.selected_tags');
    }

    return (
      <Modal
        className={css(styles.modal)}
        isLarge
        isOpen={this.props.isExportModalOpen}
        onClose={this.handleCancel}
        title={t('export.title')}
        actions={[
          <Button
            {...getTestProps(testIds.export.cancel_btn)}
            key="cancel"
            onClick={this.handleCancel}
            variant={ButtonVariant.secondary}
          >
            {t('export.cancel')}
          </Button>,
          <Button
            {...getTestProps(testIds.export.submit_btn)}
            isDisabled={fetchStatus === FetchStatus.inProgress}
            key="confirm"
            onClick={this.handleFetchReport}
            variant={ButtonVariant.primary}
          >
            {t('export.confirm')}
          </Button>,
        ]}
      >
        <h2>{t('export.heading', { groupBy })}</h2>
        <FormGroup label={t('export.aggregate_type')}>
          <React.Fragment>
            {resolutionOptions.map((option, index) => (
              <Radio
                key={index}
                id={`resolution-${index}`}
                isValid={option.value !== undefined}
                label={t(option.label)}
                value={option.value}
                checked={resolution === option.value}
                name="resolution"
                onChange={this.handleResolutionChange}
                aria-label={t(option.label)}
              />
            ))}
          </React.Fragment>
        </FormGroup>
        <FormGroup label={selectedLabel}>
          <ul>
            {sortedItems.map((groupItem, index) => {
              return <li key={index}>{groupItem.label}</li>;
            })}
          </ul>
        </FormGroup>
      </Modal>
    );
  }
}

const mapStateToProps = createMapStateToProps<
  ExportModalOwnProps,
  ExportModalStateProps
>(state => {
  return {
    error: ocpOnAwsExportSelectors.selectExportError(state),
    export: ocpOnAwsExportSelectors.selectExport(state),
    fetchStatus: ocpOnAwsExportSelectors.selectExportFetchStatus(state),
    isExportModalOpen: uiSelectors.selectIsExportModalOpen(state),
  };
});

const mapDispatchToProps: ExportModalDispatchProps = {
  exportReport: ocpOnAwsExportActions.exportReport,
  closeExportModal: uiActions.closeExportModal,
};

const ExportModal = translate()(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(ExportModalBase)
);

export { ExportModal, ExportModalProps };
