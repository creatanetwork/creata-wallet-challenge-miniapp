import { motion } from 'framer-motion';

const ProgressBar = ({ progress, showPercentage = true, height = 8, color = 'primary', animate = true }) => {
  // 진행률 계산 (0~1 범위로 제한)
  const clampedProgress = Math.min(Math.max(progress || 0, 0), 1);
  const percentage = Math.round(clampedProgress * 100);

  // 색상 클래스 매핑
  const colorClassMap = {
    primary: 'from-blue-600 to-blue-400',
    secondary: 'from-purple-600 to-purple-400',
    accent: 'from-yellow-500 to-yellow-400',
    success: 'from-green-600 to-green-400',
    warning: 'from-red-600 to-red-400',
    gradient: 'from-blue-600 to-purple-600'
  };

  const gradientClass = colorClassMap[color] || colorClassMap.primary;

  return (
    <div className="w-full">
      <div
        className="w-full bg-gray-800 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <motion.div
          className={`h-full bg-gradient-to-r ${gradientClass}`}
          initial={animate ? { width: '0%' } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {showPercentage && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{percentage}% 완료</span>
          <span className="text-xs text-gray-400">{percentage}/100</span>
        </div>
      )}
    </div>
  );
};

// 단계별 진행 표시기
export const StepProgressBar = ({ steps, currentStep }) => {
  // 유효한 현재 단계로 제한
  const validCurrentStep = Math.min(Math.max(currentStep || 0, 0), steps.length - 1);
  const progress = steps.length > 1 ? validCurrentStep / (steps.length - 1) : 1;

  return (
    <div className="w-full">
      <ProgressBar
        progress={progress}
        showPercentage={false}
        color="gradient"
      />

      <div className="flex justify-between mt-2">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex flex-col items-center"
            style={{ width: `${100 / (steps.length - 1)}%`, marginLeft: index === 0 ? 0 : `-${100 / (steps.length * 2)}%` }}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                index < validCurrentStep
                  ? 'bg-success text-white'
                  : index === validCurrentStep
                    ? 'bg-accent text-black'
                    : 'bg-gray-700 text-gray-500'
              }`}
            >
              {index < validCurrentStep ? '✓' : ''}
            </div>

            {step.label && (
              <span
                className={`text-xs mt-1 text-center ${
                  index <= validCurrentStep ? 'text-white' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 시간 진행 표시기
export const TimerProgressBar = ({ elapsed, total, showRemaining = true }) => {
  const progress = Math.min(elapsed / total, 1);
  const remaining = Math.max(0, total - elapsed);

  // 남은 시간 형식화 (mm:ss)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      <ProgressBar
        progress={progress}
        showPercentage={false}
        color={progress >= 1 ? 'success' : progress >= 0.7 ? 'warning' : 'primary'}
      />

      {showRemaining && (
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-400">
            {progress >= 1 ? '완료' : `${formatTime(remaining)} 남음`}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
