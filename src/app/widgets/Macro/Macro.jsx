import ensureArray from 'ensure-array';
import { useService } from '@xstate/react';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import React, { useContext } from 'react';
import { connect } from 'react-redux';
import Box from 'app/components/Box';
import { Button } from 'app/components/Buttons';
import Flex from 'app/components/Flex';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import useModal from 'app/components/Modal/useModal';
import RenderChildren from 'app/components/RenderChildren';
import Space from 'app/components/Space';
import Text from 'app/components/Text';
import useMount from 'app/hooks/useMount';
import i18n from 'app/lib/i18n';
import {
  CONNECTION_STATE_CONNECTED,
} from 'app/constants/connection';
import {
  MACHINE_STATE_NONE,
  REFORMED_MACHINE_STATE_IDLE,
  REFORMED_MACHINE_STATE_RUN,
} from 'app/constants/controller';
import {
  WORKFLOW_STATE_IDLE,
  WORKFLOW_STATE_PAUSED,
  WORKFLOW_STATE_RUNNING,
} from 'app/constants/workflow';
import LoadMacro from './modals/LoadMacro';
import EditMacro from './modals/EditMacro';
import NewMacro from './modals/NewMacro';
import RunMacro from './modals/RunMacro';
import { ServiceContext } from './context';

const Macro = ({
  canLoadMacro,
  canRunMacro,
}) => {
  const { fetchMacrosService } = useContext(ServiceContext);
  const [state, send] = useService(fetchMacrosService);
  const { openModal } = useModal();

  useMount(() => {
    send('FETCH');
  });

  const handleNewMacro = () => {
    openModal(NewMacro);
  };
  const handleRefreshMacros = () => {
    send('CLEAR');
    send('FETCH');
  };
  const handleExportMacros = () => {
    // FIXME
  };
  const handleLoadMacro = (macro) => () => {
    const { id, name } = macro;
    openModal(LoadMacro, { id, name });
  };
  const handleRunMacro = (macro) => () => {
    const { id, name, content } = macro;
    openModal(RunMacro, { id, name, content });
  };
  const handleEditMacro = (macro) => () => {
    const { id, name, content } = macro;
    openModal(EditMacro, { id, name, content });
  };

  return (
    <Box>
      <Flex
        align="center"
        justify="space-between"
      >
        <Box>
          <Button
            sm
            onClick={handleNewMacro}
          >
            <FontAwesomeIcon icon="plus" fixedWidth />
            <Space width={8} />
            {i18n._('New')}
          </Button>
        </Box>
        <Box>
          <Button
            sm
            onClick={handleExportMacros}
          >
            <FontAwesomeIcon icon="file-export" fixedWidth />
            <Space width={8} />
            {i18n._('Export')}
          </Button>
          <Button
            sm
            onClick={handleRefreshMacros}
            title={i18n._('Refresh')}
          >
            <FontAwesomeIcon icon="sync-alt" fixedWidth />
          </Button>
        </Box>
      </Flex>
      <RenderChildren>
        {() => {
          if (!state) {
            return null;
          }

          const isFetching = !!_get(state, 'context.isFetching');
          const isError = !!_get(state, 'context.isError');
          const data = _get(state, 'context.data');
          const noData = !data;

          if (isFetching && noData) {
            return (
              <Text>
                {i18n._('Loading...')}
              </Text>
            );
          }

          if (isError) {
            return (
              <Text color="text.danger">
                {i18n._('An error occurred while fetching data.')}
              </Text>
            );
          }

          const macros = ensureArray(_get(data, 'records'));
          const noMacrosAvailable = macros.length === 0;
          if (noMacrosAvailable) {
            return (
              <Text>
                {i18n._('No macros available')}
              </Text>
            );
          }

          return (
            <Box>
              {macros.map((macro, index) => (
                <Flex
                  key={macro.id}
                  align="center"
                  borderBottom={1}
                  borderColor="gray.20"
                >
                  <Box flex="auto">
                    <Button
                      sm
                      disabled={!canRunMacro}
                      onClick={handleRunMacro(macro)}
                      title={i18n._('Run Macro')}
                    >
                      <FontAwesomeIcon icon="play" fixedWidth />
                    </Button>
                    <Space width={8} />
                    {macro.name}
                  </Box>
                  <Box>
                    <Button
                      sm
                      disabled={!canLoadMacro}
                      onClick={handleLoadMacro(macro)}
                      title={i18n._('Load Macro')}
                    >
                      <FontAwesomeIcon icon="chevron-up" fixedWidth />
                    </Button>
                    <Button
                      sm
                      onClick={handleEditMacro(macro)}
                    >
                      <FontAwesomeIcon icon="edit" fixedWidth />
                    </Button>
                  </Box>
                </Flex>
              ))}
            </Box>
          );
        }}
      </RenderChildren>
    </Box>
  );
};

export default connect(store => {
  const isActionable = (() => {
    const connectionState = _get(store, 'connection.state');
    const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);
    if (!isConnected) {
      return false;
    }

    const workflowState = _get(store, 'controller.workflow.state');
    const isWorkflowRunning = (workflowState === WORKFLOW_STATE_RUNNING);
    if (isWorkflowRunning) {
      return false;
    }

    const reformedMachineState = _get(store, 'controller.reformedMachineState');
    const expectedStates = [
      MACHINE_STATE_NONE, // No machine state reported (e.g. Marlin).
      REFORMED_MACHINE_STATE_IDLE,
      REFORMED_MACHINE_STATE_RUN,
    ];
    const isExpectedState = _includes(expectedStates, reformedMachineState);
    return isExpectedState;
  })();
  const workflowState = _get(store, 'controller.workflow.state');
  const canLoadMacro = isActionable && _includes([
    WORKFLOW_STATE_IDLE,
  ], workflowState);
  const canRunMacro = isActionable && _includes([
    WORKFLOW_STATE_IDLE,
    WORKFLOW_STATE_PAUSED,
  ], workflowState);

  return {
    canLoadMacro,
    canRunMacro,
  };
})(Macro);
