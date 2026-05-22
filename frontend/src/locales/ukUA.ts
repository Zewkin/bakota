import type { ConfigProviderProps } from 'antd-mobile';

const typeTemplate = '${label} має неправильний тип ${type}';

const ukUA: NonNullable<ConfigProviderProps['locale']> = {
  locale: 'uk-UA',
  common: {
    confirm: 'Підтвердити',
    cancel: 'Скасувати',
    loading: 'Завантаження',
    close: 'Закрити',
  },
  Calendar: {
    title: 'Вибір дати',
    confirm: 'Підтвердити',
    start: 'початок',
    end: 'кінець',
    startAndEnd: 'початок/кінець',
    today: 'сьогодні',
    markItems: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
    yearAndMonth: '${month}.${year}',
  },
  Cascader: {
    placeholder: 'Оберіть',
  },
  Dialog: {
    ok: 'Зрозуміло',
  },
  DatePicker: {
    tillNow: 'Дотепер',
  },
  ErrorBlock: {
    default: {
      title: 'Щось пішло не так',
      description: 'Зачекайте хвилину та спробуйте ще раз',
    },
    busy: {
      title: 'Не вдалося завантажити',
      description: 'Спробуйте оновити сторінку',
    },
    disconnected: {
      title: 'Проблема з мережею',
      description: 'Спробуйте оновити сторінку',
    },
    empty: {
      title: 'Нічого не знайдено',
      description: 'Спробуйте інший запит',
    },
  },
  Form: {
    required: "Обов'язково",
    optional: "Необов'язково",
    defaultValidateMessages: {
      default: 'Помилка перевірки поля ${label}',
      required: 'Заповніть поле ${label}',
      enum: '${label} має бути одним із [${enum}]',
      whitespace: '${label} не може бути порожнім',
      date: {
        format: '${label} має неправильний формат дати',
        parse: '${label} не вдалося перетворити на дату',
        invalid: '${label} не є коректною датою',
      },
      types: {
        string: typeTemplate,
        method: typeTemplate,
        array: typeTemplate,
        object: typeTemplate,
        number: typeTemplate,
        date: typeTemplate,
        boolean: typeTemplate,
        integer: typeTemplate,
        float: typeTemplate,
        regexp: typeTemplate,
        email: typeTemplate,
        url: typeTemplate,
        hex: typeTemplate,
      },
      string: {
        len: '${label} має містити ${len} символів',
        min: '${label} має містити щонайменше ${min} символів',
        max: '${label} має містити не більше ${max} символів',
        range: '${label} має містити від ${min} до ${max} символів',
      },
      number: {
        len: '${label} має дорівнювати ${len}',
        min: '${label} має бути не менше ${min}',
        max: '${label} має бути не більше ${max}',
        range: '${label} має бути в діапазоні від ${min} до ${max}',
      },
      array: {
        len: '${label} має містити ${len} елементів',
        min: '${label} має містити щонайменше ${min} елементів',
        max: '${label} має містити не більше ${max} елементів',
        range: '${label} має містити від ${min} до ${max} елементів',
      },
      pattern: {
        mismatch: '${label} не відповідає шаблону ${pattern}',
      },
    },
  },
  ImageUploader: {
    uploading: 'Завантаження...',
    upload: 'Завантажити',
  },
  InfiniteScroll: {
    noMore: 'Більше немає',
    failedToLoad: 'Не вдалося завантажити',
    retry: 'Повторити',
  },
  Input: {
    clear: 'очистити',
  },
  Mask: {
    name: 'Фонова маска',
  },
  Modal: {
    ok: 'Зрозуміло',
  },
  NumberKeyboard: {
    backspace: 'Видалити',
  },
  PasscodeInput: {
    name: 'Введення пароля',
  },
  PullToRefresh: {
    pulling: 'Потягніть вниз, щоб оновити',
    canRelease: 'Відпустіть, щоб оновити',
    complete: 'Оновлено',
  },
  SearchBar: {
    name: 'Пошук',
  },
  Slider: {
    name: 'Повзунок',
  },
  Stepper: {
    decrease: 'зменшити',
    increase: 'збільшити',
  },
  Switch: {
    name: 'Перемикач',
  },
  Selector: {
    name: 'Вибір',
  },
};

export default ukUA;
